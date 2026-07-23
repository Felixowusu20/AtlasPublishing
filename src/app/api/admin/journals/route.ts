import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { nextJournalCoverColor } from "@/lib/journal-colors";
import { slugify } from "@/lib/submission-utils";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const journals = await prisma.journal.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return jsonOk({ journals });
}

const schema = z.object({
  title: z.string().min(2),
  shortTitle: z.string().min(1),
  slug: z.string().optional(),
  issn: z.string().optional(),
  eIssn: z.string().optional(),
  doiPrefix: z.string().optional(),
  frequency: z.string().optional(),
  reviewType: z.enum(["SINGLE_BLIND", "DOUBLE_BLIND", "OPEN_REVIEW"]).optional(),
  description: z.string().min(2),
  aims: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  impactFactor: z.string().optional(),
  acceptanceRate: z.string().optional(),
  avgReviewDays: z.number().int().optional(),
  openAccess: z.boolean().optional(),
  apc: z.string().optional(),
  editorInChief: z.string().optional(),
  coverColor: z.string().optional(),
  coverImageUrl: z.string().optional(),
  coverImagePublicId: z.string().optional(),
  indexedIn: z.array(z.string()).optional(),
  foundedYear: z.number().int().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = schema.parse(await request.json());
    const slug = body.slug?.trim() || slugify(body.title);

    const existing = await prisma.journal.findMany({
      select: { coverColor: true },
    });
    const coverColor =
      body.coverColor?.trim() ||
      nextJournalCoverColor(existing.map((j) => j.coverColor));

    const journal = await prisma.journal.create({
      data: {
        ...body,
        slug,
        coverColor,
        subjects: body.subjects ?? [],
        indexedIn: body.indexedIn ?? [],
        reviewType: body.reviewType ?? "DOUBLE_BLIND",
        openAccess: body.openAccess ?? true,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return jsonCreated({ journal });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not create journal", 500);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const raw = await request.json();
    const id = z.string().parse(raw.id);
    const data = schema.partial().parse(raw);
    const journal = await prisma.journal.update({ where: { id }, data });
    return jsonOk({ journal });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not update journal", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  await prisma.journal.delete({ where: { id } });
  return jsonOk({ ok: true });
}
