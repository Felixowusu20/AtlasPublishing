import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { passwordResetEmailHtml, sendEmail } from "@/lib/mail";

const schema = z.object({
  email: z.string().email(),
});

/**
 * Always returns a generic success message to avoid email enumeration.
 * Only AUTHOR accounts receive reset links.
 */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.role === "AUTHOR") {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetUrl = `${base}/reset-password?token=${token}`;

      void sendEmail({
        to: user.email,
        subject: "Reset your Atlas password",
        html: passwordResetEmailHtml({
          name: user.name,
          resetUrl,
        }),
      });
    }

    return jsonOk({
      ok: true,
      message:
        "If an author account exists for that email, a reset link has been sent.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not process request", 500);
  }
}
