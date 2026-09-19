-- Homepage CMS: Get started tabs + Indexed platforms + section headings.
-- Safe, additive-only (no data loss).

CREATE TABLE IF NOT EXISTS "HomeGoalTab" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "story" TEXT,
  "imageUrl" TEXT NOT NULL,
  "imagePublicId" TEXT,
  "imageAlt" TEXT,
  "imageCaption" TEXT,
  "links" JSONB NOT NULL DEFAULT '[]',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeGoalTab_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HomeGoalTab_key_key" ON "HomeGoalTab"("key");
CREATE INDEX IF NOT EXISTS "HomeGoalTab_sortOrder_idx" ON "HomeGoalTab"("sortOrder");
CREATE INDEX IF NOT EXISTS "HomeGoalTab_isActive_idx" ON "HomeGoalTab"("isActive");

CREATE TABLE IF NOT EXISTS "IndexedPlatform" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "blurb" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "logoUrl" TEXT NOT NULL,
  "logoPublicId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IndexedPlatform_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IndexedPlatform_sortOrder_idx" ON "IndexedPlatform"("sortOrder");
CREATE INDEX IF NOT EXISTS "IndexedPlatform_isActive_idx" ON "IndexedPlatform"("isActive");

CREATE TABLE IF NOT EXISTS "HomeSection" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "eyebrow" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HomeSection_key_key" ON "HomeSection"("key");
