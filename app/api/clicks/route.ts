import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  const sinceParam = searchParams.get("since");
  const since = sinceParam
    ? new Date(sinceParam)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rtoCode = searchParams.get("rto_code") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 1000), 1000);

  const events = await prisma.clickEvent.findMany({
    where: {
      clickedAt: { gte: since },
      ...(rtoCode ? { rtoCodeSnapshot: rtoCode } : {}),
    },
    include: {
      trackedLink: { select: { slug: true, destinationUrl: true } },
    },
    orderBy: { clickedAt: "desc" },
    take: limit,
  });

  const clicks = events.map((e) => ({
    rto_code: e.rtoCodeSnapshot,
    rto_name: e.rtoNameSnapshot,
    tracked_url: `/r/${e.trackedLink.slug}`,
    destination_url: e.trackedLink.destinationUrl,
    clicked_at: e.clickedAt.toISOString(),
    ip_address: e.ipAddress ?? null,
    user_agent: e.userAgent ?? null,
  }));

  return Response.json({
    clicks,
    total: clicks.length,
    since: since.toISOString(),
    fetched_at: new Date().toISOString(),
  });
}
