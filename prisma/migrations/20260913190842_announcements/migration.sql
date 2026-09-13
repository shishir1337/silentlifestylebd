-- CreateEnum
CREATE TYPE "AnnouncementIcon" AS ENUM ('NONE', 'CASH', 'TRUCK', 'RETURN', 'SHIELD');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "icon" "AnnouncementIcon" NOT NULL DEFAULT 'NONE',
    "href" TEXT,
    "wideOnly" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_isActive_position_idx" ON "Announcement"("isActive", "position");
