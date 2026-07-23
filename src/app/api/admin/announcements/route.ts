import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const announcements = await prisma.announcement.findMany({
    orderBy: { publishedAt: "desc" },
  });
  return jsonOk({ announcements });
}

const schema = z.object({
  title: z.string().min(2),
  summary: z.string().min(2),
  href: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = schema.parse(await request.json());
    const announcement = await prisma.announcement.create({
      data: {
        title: body.title,
        summary: body.summary,
        href: body.href,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
        isActive: body.isActive ?? true,
      },
    });
    return jsonCreated({ announcement });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not create announcement", 500);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const raw = await request.json();
    const id = z.string().parse(raw.id);
    const data = schema.partial().parse(raw);
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      },
    });
    return jsonOk({ announcement });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not update announcement", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  await prisma.announcement.delete({ where: { id } });
  return jsonOk({ ok: true });
}
