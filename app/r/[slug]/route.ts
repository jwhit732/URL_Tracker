import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const trackedLink = await prisma.trackedLink.findUnique({
    where: { slug, isActive: true },
    include: { rto: true },
  });

  if (!trackedLink) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Fire-and-forget click log — don't block the redirect
  prisma.clickEvent
    .create({
      data: {
        trackedLinkId: trackedLink.id,
        rtoCodeSnapshot: trackedLink.rto.rtoCode,
        rtoNameSnapshot: trackedLink.rto.rtoName,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
        userAgent: request.headers.get("user-agent") ?? null,
        referer: request.headers.get("referer") ?? null,
      },
    })
    .catch((err) => console.error("Failed to log click:", err));

  // 302 so browsers don't cache — future destination changes will work
  return NextResponse.redirect(trackedLink.destinationUrl, { status: 302 });
}
