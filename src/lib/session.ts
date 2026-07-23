import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma/client";

export const SESSION_COOKIE = "atlas_session";
export const ADMIN_SESSION_COOKIE = "atlas_admin_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret === "replace-with-a-long-random-secret") {
    // Allow local bootstrap with a fixed fallback so generate still works;
    // production must set AUTH_SECRET.
    return new TextEncoder().encode(
      secret || "dev-only-atlas-secret-change-me-please-32chars",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionPayload, days = 7) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: String(payload.name ?? ""),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  cookieName: string,
  token: string,
  days = 7,
) {
  const jar = await cookies();
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(cookieName: string) {
  const jar = await cookies();
  jar.delete(cookieName);
}

export async function getSession(
  cookieName: string = SESSION_COOKIE,
): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser(roles?: Role[]) {
  const session = await getSession(SESSION_COOKIE);
  if (!session) return null;
  if (roles && !roles.includes(session.role)) return null;
  return session;
}

export async function requireAdmin(roles: Role[] = ["SUPER_ADMIN", "REVIEWER"]) {
  const session = await getSession(ADMIN_SESSION_COOKIE);
  if (!session) return null;
  if (!roles.includes(session.role)) return null;
  return session;
}

export function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  institution: string | null;
  orcid: string | null;
  researchInterests: string[];
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    institution: user.institution ?? "",
    orcid: user.orcid ?? "",
    researchInterests: user.researchInterests,
  };
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
