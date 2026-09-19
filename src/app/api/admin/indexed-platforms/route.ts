import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { ensureIndexedPlatformsSeeded } from "@/lib/home-cms-seed";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    await ensureIndexedPlatformsSeeded();
  } catch (err) {
    console.error(err);
  }

  const [platforms, section] = await Promise.all([
    prisma.indexedPlatform.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.homeSection.findUnique({ where: { key: "indexed" } }),
  ]);
  return jsonOk({ platforms, section });
}

const platformSchema = z.object({
  name: z.string().min(2),
  blurb: z.string().min(2),
  href: z.string().url(),
  logoUrl: z.string().min(1),
  logoPublicId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const sectionSchema = z.object({
  eyebrow: z.string().optional().nullable(),
  title: z.string().min(2),
  body: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = platformSchema.parse(await request.json());
    const platform = await prisma.indexedPlatform.create({
      data: {
        name: body.name,
        blurb: body.blurb,
        href: body.href,
        logoUrl: body.logoUrl,
        logoPublicId: body.logoPublicId || null,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    return jsonCreated({ platform });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not create platform", 500);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const raw = await request.json();

    if (raw?.section === true) {
      const data = sectionSchema.parse(raw);
      const section = await prisma.homeSection.upsert({
        where: { key: "indexed" },
        create: {
          key: "indexed",
          eyebrow: data.eyebrow || null,
          title: data.title,
          body: data.body || null,
        },
        update: {
          eyebrow: data.eyebrow || null,
          title: data.title,
          body: data.body || null,
        },
      });
      return jsonOk({ section });
    }

    const id = z.string().min(1).parse(raw.id);
    const rest = { ...(raw as Record<string, unknown>) };
    delete rest.id;
    delete rest.section;
    const data = platformSchema.partial().parse(rest);
    if (Object.keys(data).length === 0) {
      return jsonError("No fields to update");
    }
    const platform = await prisma.indexedPlatform.update({
      where: { id },
      data,
    });
    return jsonOk({ platform });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not update", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  await prisma.indexedPlatform.delete({ where: { id } });
  return jsonOk({ ok: true });
}
