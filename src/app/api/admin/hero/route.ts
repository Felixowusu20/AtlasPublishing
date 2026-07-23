import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const slides = await prisma.heroSlide.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return jsonOk({ slides });
}

const schema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  imageUrl: z.string().url(),
  imagePublicId: z.string().optional(),
  alt: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = schema.parse(await request.json());
    const slide = await prisma.heroSlide.create({
      data: {
        title: body.title,
        body: body.body,
        imageUrl: body.imageUrl,
        imagePublicId: body.imagePublicId,
        alt: body.alt,
        ctaLabel: body.ctaLabel,
        ctaHref: body.ctaHref,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    return jsonCreated({ slide });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not create slide", 500);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const raw = await request.json();
    const id = z.string().parse(raw.id);
    const data = schema.partial().parse(raw);
    const slide = await prisma.heroSlide.update({ where: { id }, data });
    return jsonOk({ slide });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not update slide", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  await prisma.heroSlide.delete({ where: { id } });
  return jsonOk({ ok: true });
}
