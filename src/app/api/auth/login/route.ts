import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import {
  createToken,
  publicUser,
  setSessionCookie,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/session";
import { loginAlertEmailHtml, sendEmail } from "@/lib/mail";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "AUTHOR") {
      return jsonError("Invalid email or password.", 401);
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return jsonError("Invalid email or password.", 401);
    }

    const token = await createToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(SESSION_COOKIE, token);

    void sendEmail({
      to: user.email,
      subject: "Atlas sign-in notification",
      html: loginAlertEmailHtml(user.name, new Date().toUTCString()),
    });

    return jsonOk({ user: publicUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Login failed", 500);
  }
}
