import Link from "next/link";
import { prisma } from "@/lib/prisma";

const RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "All time", value: "all" },
];

function getStartDate(range: string): Date | null {
  const now = new Date();
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; range?: string }>;
}) {
  const { q = "", range = "7d" } = await searchParams;
  const startDate = getStartDate(range);

  const [clicks, allCounts] = await Promise.all([
    prisma.clickEvent.findMany({
      where: {
        ...(startDate ? { clickedAt: { gte: startDate } } : {}),
        ...(q
          ? {
              OR: [
                { rtoCodeSnapshot: { contains: q, mode: "insensitive" } },
                { rtoNameSnapshot: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { trackedLink: true },
      orderBy: { clickedAt: "desc" },
      take: 200,
    }),
    prisma.clickEvent.groupBy({
      by: ["trackedLinkId"],
      _count: { id: true },
    }),
  ]);

  const countMap = new Map(allCounts.map((c) => [c.trackedLinkId, c._count.id]));

  return (
    <div className="py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">Click Log</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search — plain GET form, no JS required */}
        <form method="GET" className="flex gap-2 items-center">
          <input type="hidden" name="range" value={range} />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search RTO code or name…"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700"
          >
            Search
          </button>
          {q && (
            <Link
              href={`/admin?range=${range}`}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Date range filter */}
        <div className="flex gap-1 sm:ml-auto">
          {RANGE_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/admin?range=${opt.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`text-sm px-3 py-1.5 rounded border transition-colors ${
                range === opt.value
                  ? "bg-gray-800 text-white border-gray-800"
                  : "border-gray-300 text-gray-600 hover:border-gray-500"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {clicks.length === 200
          ? "Showing first 200 results — refine your search to narrow down."
          : `${clicks.length} click${clicks.length !== 1 ? "s" : ""}`}
      </p>

      {clicks.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          No clicks found for this period.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                  Clicked at
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                  RTO code
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  RTO name
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Tracked URL
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Destination
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                  Total clicks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clicks.map((click) => (
                <tr key={click.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                    {formatDate(click.clickedAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-800">
                    {click.rtoCodeSnapshot}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {click.rtoNameSnapshot}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/r/${click.trackedLink.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-blue-600 hover:underline"
                    >
                      /r/{click.trackedLink.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3 max-w-[220px] truncate">
                    <a
                      href={click.trackedLink.destinationUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={click.trackedLink.destinationUrl}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {click.trackedLink.destinationUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {countMap.get(click.trackedLinkId) ?? 1}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
