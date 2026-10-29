-- Keep the author’s response-to-reviewers file beside the revised manuscript.
ALTER TABLE "Submission"
  ADD COLUMN IF NOT EXISTS "manuscriptFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "responseFileUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "responseFilePublicId" TEXT,
  ADD COLUMN IF NOT EXISTS "responseFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "responseFileBytes" INTEGER;

-- Backfill from resubmissions already stored as feedback.
UPDATE "Submission" AS s
SET
  "responseFileUrl" = f."fileUrl",
  "responseFilePublicId" = f."filePublicId",
  "responseFileName" = f."fileName",
  "responseFileBytes" = f."fileBytes"
FROM (
  SELECT DISTINCT ON ("submissionId")
    "submissionId",
    "fileUrl",
    "filePublicId",
    "fileName",
    "fileBytes"
  FROM "ReviewFeedback"
  WHERE "fileUrl" IS NOT NULL
    AND message LIKE 'Author response to reviewers:%'
  ORDER BY "submissionId", "createdAt" DESC
) AS f
WHERE s.id = f."submissionId"
  AND s."responseFileUrl" IS NULL;
