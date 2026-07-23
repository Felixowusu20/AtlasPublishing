import { z } from "zod";
import { prisma } from "@/lib/db";
import { forbidden, jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { hashPassword, requireAdmin, publicUser } from "@/lib/session";
import { reviewerInviteEmailHtml, sendEmail } from "@/lib/mail";

export async function GET() {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  const reviewers = await prisma.user.findMany({
    where: { role: "REVIEWER" },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ reviewers: reviewers.map(publicUser) });
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  institution: z.string().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = createSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) return jsonError("Email already in use.", 409);

    const passwordHash = await hashPassword(body.password);
    const reviewer = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash,
        role: "REVIEWER",
        institution: body.institution?.trim() || null,
        createdById: admin.sub,
      },
    });

    void sendEmail({
      to: reviewer.email,
      subject: "Atlas reviewer account",
      html: reviewerInviteEmailHtml({
        name: reviewer.name,
        email: reviewer.email,
        tempNote:
          "Sign in with the password provided by your administrator, then change it if needed.",
      }),
    });

    return jsonCreated({ reviewer: publicUser(reviewer) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not create reviewer", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return jsonError("Missing id");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "REVIEWER") return forbidden("Not a reviewer");

  await prisma.user.delete({ where: { id } });
  return jsonOk({ ok: true });
}
