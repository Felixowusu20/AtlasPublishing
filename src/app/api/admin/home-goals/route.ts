import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { ensureHomeGoalTabsSeeded } from "@/lib/home-cms-seed";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    await ensureHomeGoalTabsSeeded();
  } catch (err) {
    console.error(err);
  }

  const [tabs, section] = await Promise.all([
    prisma.homeGoalTab.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.homeSection.findUnique({ where: { key: "goals" } }),
  ]);
  return jsonOk({ tabs, section });
}

const linkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const tabSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Key must be lowercase letters, numbers, or hyphens"),
  label: z.string().min(2),
  title: z.string().min(2),
  body: z.string().min(2),
  story: z.string().optional().nullable(),
  imageUrl: z.string().url(),
  imagePublicId: z.string().optional().nullable(),
  imageAlt: z.string().optional().nullable(),
  imageCaption: z.string().optional().nullable(),
  links: z.array(linkSchema).max(6).optional(),
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
    const body = tabSchema.parse(await request.json());
    const tab = await prisma.homeGoalTab.create({
      data: {
        key: body.key,
        label: body.label,
        title: body.title,
        body: body.body,
        story: body.story || null,
        imageUrl: body.imageUrl,
        imagePublicId: body.imagePublicId || null,
        imageAlt: body.imageAlt || null,
        imageCaption: body.imageCaption || null,
        links: body.links ?? [],
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    return jsonCreated({ tab });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not create tab", 500);
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
        where: { key: "goals" },
        create: {
          key: "goals",
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
    const data = tabSchema.partial().parse(rest);
    if (Object.keys(data).length === 0) {
      return jsonError("No fields to update");
    }
    const tab = await prisma.homeGoalTab.update({ where: { id }, data });
    return jsonOk({ tab });
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
  await prisma.homeGoalTab.delete({ where: { id } });
  return jsonOk({ ok: true });
}
