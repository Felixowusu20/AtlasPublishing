-- Additive columns for full-manuscript production editing
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "productionBody" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "productionFigures" JSONB;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "manuscriptReadyAt" TIMESTAMP(3);
