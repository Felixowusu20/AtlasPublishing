import { SignJWT, jwtVerify } from "jose";
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

export async function apcPayPageUrl(submissionId: string): Promise<string> {
  const token = await createApcPayToken(submissionId);
  return `${getAppBaseUrl()}/pay/${encodeURIComponent(token)}`;
}
