"use server";

import { prisma } from "@/lib/prisma";
import { parseBatchInput, type ParseError } from "@/lib/parseBatch";

export interface BatchResultLink {
  rtoCode: string;
  rtoName: string;
  slug: string;
  destinationUrl: string;
  createdAt: string;
  isNew: boolean;
}

export type CreateBatchState =
  | null
  | {
      status: "success";
      batchId: string;
      links: BatchResultLink[];
      parseWarnings: ParseError[];
    }
  | {
      status: "error";
      message?: string;
      fieldErrors?: Partial<Record<"destinationUrl" | "rows", string>>;
      parseErrors?: ParseError[];
    };

export async function createBatch(
  _prev: CreateBatchState,
  formData: FormData,
): Promise<CreateBatchState> {
  const destinationUrl = (formData.get("destinationUrl") as string | null)?.trim() ?? "";
  const label = (formData.get("label") as string | null)?.trim() || null;
  const rowsInput = (formData.get("rows") as string | null) ?? "";

  // Validate destination URL
  try {
    const parsed = new URL(destinationUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return {
      status: "error",
      fieldErrors: { destinationUrl: "Enter a valid URL starting with https://" },
    };
  }

  // Parse row input
  const { rows, errors: parseErrors } = parseBatchInput(rowsInput);

  if (rows.length === 0) {
    return {
      status: "error",
      fieldErrors:
        parseErrors.length > 0
          ? undefined
          : { rows: "Paste at least one row in the format: rto_code, rto_name" },
      parseErrors: parseErrors.length > 0 ? parseErrors : undefined,
    };
  }

  try {
    const batch = await prisma.linkBatch.create({
      data: { destinationUrl, label },
    });

    const links: BatchResultLink[] = [];

    for (const { rtoCode, rtoName } of rows) {
      // Upsert RTO — update name if it changed
      const rto = await prisma.rto.upsert({
        where: { rtoCode },
        update: { rtoName },
        create: { rtoCode, rtoName },
      });

      const slug = rtoCode; // MVP: slug = rtoCode
      const existing = await prisma.trackedLink.findUnique({ where: { slug } });

      let trackedLink;
      let isNew: boolean;

      if (existing) {
        // Reuse existing slug — update destination + re-associate with new batch
        trackedLink = await prisma.trackedLink.update({
          where: { slug },
          data: { batchId: batch.id, destinationUrl, isActive: true },
        });
        isNew = false;
      } else {
        trackedLink = await prisma.trackedLink.create({
          data: { batchId: batch.id, rtoId: rto.id, slug, destinationUrl },
        });
        isNew = true;
      }

      links.push({
        rtoCode,
        rtoName,
        slug: trackedLink.slug,
        destinationUrl: trackedLink.destinationUrl,
        createdAt: trackedLink.createdAt.toISOString(),
        isNew,
      });
    }

    return {
      status: "success",
      batchId: batch.id,
      links,
      parseWarnings: parseErrors, // rows that had parse issues but didn't block generation
    };
  } catch (err) {
    console.error("createBatch error:", err);
    return { status: "error", message: "Database error — please try again." };
  }
}
