import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { getAuthSecret } from "@/lib/session";
import { getAppBaseUrl } from "@/lib/app-url";

const PURPOSE = "apc-pay";

export async function createApcPayToken(submissionId: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(submissionId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getAuthSecret());
}

export async function verifyApcPayToken(
  token: string,
): Promise<{ submissionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (payload.purpose !== PURPOSE || !payload.sub) return null;
    return { submissionId: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Resolve an email/pay-page token: JWT, Payment.id, or Paystack reference.
 * Payment.id is preferred in emails so clients do not break a long JWT.
 */
export async function resolveApcPayLink(
  token: string,
): Promise<{ submissionId: string } | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const fromJwt = await verifyApcPayToken(trimmed);
  if (fromJwt) return fromJwt;

  const byId = await prisma.payment.findUnique({
    where: { id: trimmed },
    select: { submissionId: true },
  });
  if (byId) return { submissionId: byId.submissionId };

  const byRef = await prisma.payment.findUnique({
    where: { paystackReference: trimmed },
    select: { submissionId: true },
  });
  return byRef ? { submissionId: byRef.submissionId } : null;
}

/** Public checkout URL for the acceptance email — not the manuscript viewer. */
export async function apcPayPageUrl(submissionId: string): Promise<string> {
  const payment = await prisma.payment.findUnique({
    where: { submissionId },
    select: { id: true },
  });
  const token = payment?.id ?? (await createApcPayToken(submissionId));
  return `${getAppBaseUrl()}/pay/${encodeURIComponent(token)}`;
}
