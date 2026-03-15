import { prisma } from "@/lib/prisma";

interface RtoInput {
  rto_code: string;
  rto_name: string;
}

interface RequestBody {
  destination_url: string;
  rtos: RtoInput[];
  label?: string;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate destination_url
  try {
    const url = new URL(body.destination_url);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
  } catch {
    return Response.json(
      { error: "destination_url must be a valid http/https URL" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.rtos) || body.rtos.length === 0) {
    return Response.json(
      { error: "rtos must be a non-empty array" },
      { status: 400 }
    );
  }

  // Validate and dedupe
  const seen = new Set<string>();
  const valid: RtoInput[] = [];
  const errors: { rto_code: string; error: string }[] = [];

  for (const rto of body.rtos) {
    if (!rto.rto_code) {
      errors.push({ rto_code: "", error: "rto_code is required" });
      continue;
    }
    if (!rto.rto_name) {
      errors.push({ rto_code: rto.rto_code, error: "rto_name is required" });
      continue;
    }
    if (seen.has(rto.rto_code)) continue;
    seen.add(rto.rto_code);
    valid.push(rto);
  }

  const batch = await prisma.linkBatch.create({
    data: {
      destinationUrl: body.destination_url,
      // ↓ Customise this label per campaign if needed
      label: body.label ?? "api-batch",
    },
  });

  const links = [];
  let created = 0;
  let reused = 0;

  for (const rto of valid) {
    // Upsert the Rto record
    const rtoRecord = await prisma.rto.upsert({
      where: { rtoCode: rto.rto_code },
      update: { rtoName: rto.rto_name },
      create: { rtoCode: rto.rto_code, rtoName: rto.rto_name },
    });

    // Check for an existing active TrackedLink
    const existing = await prisma.trackedLink.findFirst({
      where: { rtoId: rtoRecord.id, isActive: true },
    });

    let status: "created" | "reused";
    let slug: string;

    if (existing) {
      await prisma.trackedLink.update({
        where: { id: existing.id },
        data: { destinationUrl: body.destination_url },
      });
      status = "reused";
      slug = existing.slug;
      reused++;
    } else {
      const link = await prisma.trackedLink.create({
        data: {
          batchId: batch.id,
          rtoId: rtoRecord.id,
          slug: rto.rto_code,
          destinationUrl: body.destination_url,
          isActive: true,
        },
      });
      status = "created";
      slug = link.slug;
      created++;
    }

    links.push({
      rto_code: rto.rto_code,
      rto_name: rto.rto_name,
      slug,
      tracked_url: `/r/${slug}`,
      status,
    });
  }

  return Response.json({
    batch_id: batch.id,
    destination_url: body.destination_url,
    links,
    created,
    reused,
    total: links.length,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
