import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { ensureCmsDefaults } from "@/lib/cms";

export async function GET() {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  await ensureCmsDefaults();
  const faqs = await prisma.faqItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return jsonOk({ faqs });
}

const schema = z.object({
  question: z.string().min(3),
  answer: z.string().min(3),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = schema.parse(await request.json());
    const max = await prisma.faqItem.aggregate({ _max: { sortOrder: true } });
    const faq = await prisma.faqItem.create({
      data: {
        question: body.question,
        answer: body.answer,
        sortOrder: body.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
        isActive: body.isActive ?? true,
      },
    });
    return jsonCreated({ faq });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not create FAQ", 500);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const raw = await request.json();
    const id = z.string().parse(raw.id);
    const data = schema.partial().parse(raw);
    const faq = await prisma.faqItem.update({
      where: { id },
      data,
    });
    return jsonOk({ faq });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not update FAQ", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  await prisma.faqItem.delete({ where: { id } });
  return jsonOk({ ok: true });
}
