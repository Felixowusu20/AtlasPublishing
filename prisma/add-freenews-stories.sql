-- Free News API sync: NewsStory table + source ids on announcements/hero.
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "externalUuid" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "source" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Announcement_externalUuid_key" ON "Announcement"("externalUuid");
CREATE INDEX IF NOT EXISTS "Announcement_source_idx" ON "Announcement"("source");

ALTER TABLE "HeroSlide" ADD COLUMN IF NOT EXISTS "externalUuid" TEXT;
ALTER TABLE "HeroSlide" ADD COLUMN IF NOT EXISTS "source" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "HeroSlide_externalUuid_key" ON "HeroSlide"("externalUuid");
CREATE INDEX IF NOT EXISTS "HeroSlide_source_idx" ON "HeroSlide"("source");

CREATE TABLE IF NOT EXISTS "NewsStory" (
  "id" TEXT NOT NULL,
  "externalUuid" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "imageUrl" TEXT,
  "publisher" TEXT,
  "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "originalUrl" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "showInHero" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsStory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NewsStory_externalUuid_key" ON "NewsStory"("externalUuid");
CREATE UNIQUE INDEX IF NOT EXISTS "NewsStory_slug_key" ON "NewsStory"("slug");
CREATE INDEX IF NOT EXISTS "NewsStory_publishedAt_idx" ON "NewsStory"("publishedAt");
CREATE INDEX IF NOT EXISTS "NewsStory_isActive_idx" ON "NewsStory"("isActive");
CREATE INDEX IF NOT EXISTS "NewsStory_showInHero_idx" ON "NewsStory"("showInHero");
