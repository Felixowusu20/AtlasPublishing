-- Author-uploaded PayPal payment screenshot
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "proofUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "proofPublicId" TEXT,
  ADD COLUMN IF NOT EXISTS "proofFileName" TEXT;
