import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError } from "@/lib/api";
import {
  createToken,
  hashPassword,
  publicUser,
  setSessionCookie,
  SESSION_COOKIE,
} from "@/lib/session";
import { sendEmail, welcomeEmailHtml } from "@/lib/mail";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  institution: z.string().min(2),
  orcid: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError("An account with this email already exists.", 409);
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash,
        role: "AUTHOR",
        institution: body.institution.trim(),
        orcid: body.orcid?.trim() || null,
      },
    });

    const token = await createToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(SESSION_COOKIE, token);

    void sendEmail({
      to: user.email,
      subject: "Welcome to Atlas Academic Publishing",
      html: welcomeEmailHtml(user.name),
    });

    return jsonCreated({ user: publicUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Registration failed", 500);
  }
}
