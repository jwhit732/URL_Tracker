-- CreateTable
CREATE TABLE "rtos" (
    "id" TEXT NOT NULL,
    "rtoCode" TEXT NOT NULL,
    "rtoName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_batches" (
    "id" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_links" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rtoId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" TEXT NOT NULL,
    "trackedLinkId" TEXT NOT NULL,
    "rtoCodeSnapshot" TEXT NOT NULL,
    "rtoNameSnapshot" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digest_runs" (
    "id" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clickCount" INTEGER NOT NULL,
    "uniqueRtoCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "digest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rtos_rtoCode_key" ON "rtos"("rtoCode");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_links_slug_key" ON "tracked_links"("slug");

-- AddForeignKey
ALTER TABLE "tracked_links" ADD CONSTRAINT "tracked_links_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "link_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_links" ADD CONSTRAINT "tracked_links_rtoId_fkey" FOREIGN KEY ("rtoId") REFERENCES "rtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_trackedLinkId_fkey" FOREIGN KEY ("trackedLinkId") REFERENCES "tracked_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
