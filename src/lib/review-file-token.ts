import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SEC = 90 * 24 * 60 * 60;

function tokenSecret() {
  return (
    process.env.AUTH_SECRET ||
    "dev-only-nahda-secret-change-me-please-32chars"
  );
}

export function signReviewFileToken(feedbackId: string) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const payload = `${feedbackId}.${exp}`;
  const sig = createHmac("sha256", tokenSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyReviewFileToken(token: string, feedbackId: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [id, expRaw, sig] = parts;
  if (id !== feedbackId) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${id}.${expRaw}`;
  const expected = createHmac("sha256", tokenSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
