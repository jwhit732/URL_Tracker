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

  const grouped = await prisma.clickEvent.groupBy({
    by: ["rtoCodeSnapshot", "rtoNameSnapshot"],
    where: {
      clickedAt: { gte: since },
      ...(rtoCode ? { rtoCodeSnapshot: rtoCode } : {}),
    },
    _count: { id: true },
    _min: { clickedAt: true },
    _max: { clickedAt: true },
    orderBy: { _count: { id: "desc" } },
  });

  const rtos = grouped.map((r) => ({
    rto_code: r.rtoCodeSnapshot,
    rto_name: r.rtoNameSnapshot,
    total_clicks: r._count.id,
    first_click: r._min.clickedAt?.toISOString() ?? null,
    last_click: r._max.clickedAt?.toISOString() ?? null,
  }));

  const totalClicks = rtos.reduce((sum, r) => sum + r.total_clicks, 0);

  return Response.json({
    rtos,
    total_clicks: totalClicks,
    unique_rtos: rtos.length,
    since: since.toISOString(),
  });
}
