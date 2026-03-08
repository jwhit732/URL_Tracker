import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Triggered daily by Vercel Cron (see vercel.json).
// Also callable manually: POST /api/jobs/digest -H "Authorization: Bearer $CRON_SECRET"
export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorised", { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Group by link + RTO snapshots in one query — avoids a separate JS reduce step
  const grouped = await prisma.clickEvent.groupBy({
    by: ["trackedLinkId", "rtoCodeSnapshot", "rtoNameSnapshot"],
    where: { clickedAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const clickCount = grouped.reduce((sum, r) => sum + r._count.id, 0);
  const uniqueRtoCount = grouped.length;

  // Always record the run, even when skipped
  if (clickCount === 0) {
    await prisma.digestRun.create({
      data: { clickCount: 0, uniqueRtoCount: 0, status: "skipped" },
    });
    return Response.json({ status: "skipped" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    // Replace with a Resend-verified sender domain before going live.
    // For sandbox testing, "onboarding@resend.dev" works when sending to your own verified address.
    from: process.env.DIGEST_FROM_EMAIL ?? "onboarding@resend.dev",
    to: process.env.DIGEST_TO_EMAIL!,
    subject: `RTO Tracker — ${clickCount} click${clickCount !== 1 ? "s" : ""} in the last 24 hours`,
    html: buildEmailHtml(grouped, clickCount, uniqueRtoCount, since),
  });

  if (error) {
    console.error("Resend error:", error);
    return Response.json({ status: "error", error }, { status: 500 });
  }

  await prisma.digestRun.create({
    data: { clickCount, uniqueRtoCount, status: "sent" },
  });

  return Response.json({ status: "sent", clickCount, uniqueRtoCount });
}

type GroupedRow = {
  rtoCodeSnapshot: string;
  rtoNameSnapshot: string;
  _count: { id: number };
};

function buildEmailHtml(
  rows: GroupedRow[],
  clickCount: number,
  uniqueRtoCount: number,
  since: Date
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const sinceLabel = since.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 12px;font-family:monospace;border-bottom:1px solid #e5e7eb">${r.rtoCodeSnapshot}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.rtoNameSnapshot}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb">${r._count.id}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px;font-family:system-ui,sans-serif;font-size:14px;color:#111827;background:#f9fafb">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#1f2937;padding:20px 24px">
      <p style="margin:0;color:#f9fafb;font-weight:600;font-size:15px">RTO Tracker — Daily Digest</p>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 4px">
        <strong>${clickCount} click${clickCount !== 1 ? "s" : ""}</strong> across
        <strong>${uniqueRtoCount} RTO${uniqueRtoCount !== 1 ? "s" : ""}</strong> since ${sinceLabel}.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:20px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">RTO Code</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">RTO Name</th>
            <th style="padding:8px 12px;text-align:right;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">Clicks</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      ${
        appUrl
          ? `<p style="margin:24px 0 0"><a href="${appUrl}/admin" style="color:#2563eb">View full dashboard →</a></p>`
          : ""
      }
    </div>
  </div>
</body>
</html>`;
}
