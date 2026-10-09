-- APC: author-reported PayPal payments awaiting confirmation
ALTER TYPE "ApcPaymentStatus" ADD VALUE IF NOT EXISTS 'REPORTED';

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "reportedAt" TIMESTAMP(3);
