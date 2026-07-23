import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError } from "@/lib/api";
import {
  ADMIN_SESSION_COOKIE,
  createToken,
  hashPassword,
  publicUser,
  setSessionCookie,
} from "@/lib/session";
import { sendEmail, welcomeEmailHtml } from "@/lib/mail";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  institution: z.string().optional(),
});

/** First super-admin bootstrap. Blocked once a SUPER_ADMIN already exists. */
export async function POST(request: Request) {
  try {
    const existingAdmin = await prisma.user.count({
      where: { role: "SUPER_ADMIN" },
    });
    if (existingAdmin > 0) {
      return jsonError(
        "A super admin already exists. Ask them to create accounts for you.",
        403,
      );
    }

    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) return jsonError("Email already in use.", 409);

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash,
        role: "SUPER_ADMIN",
        institution: body.institution?.trim() || "Atlas Publishing House",
      },
    });

    const token = await createToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(ADMIN_SESSION_COOKIE, token);

    void sendEmail({
      to: user.email,
      subject: "Atlas Super Admin account created",
      html: welcomeEmailHtml(user.name),
    });

    return jsonCreated({ user: publicUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Admin registration failed", 500);
  }
}
