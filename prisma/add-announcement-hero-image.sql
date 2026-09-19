-- Add optional hero image fields to announcements.
-- Safe, additive-only (no data loss).

ALTER TABLE "Announcement"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "imagePublicId" TEXT;

CREATE INDEX IF NOT EXISTS "Announcement_isActive_idx" ON "Announcement"("isActive");
