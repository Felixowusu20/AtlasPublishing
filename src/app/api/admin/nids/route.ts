import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import {
  DEFAULT_NID_PREFIX,
  isValidNidShape,
  nidPath,
  normalizeNid,
} from "@/lib/doi";
import {
  backfillMissingNids,
  getDoiSettings,
  isNidTaken,
} from "@/lib/doi-db";
import { absoluteUrl } from "@/lib/seo/scholar";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const [settings, articles, missingCount] = await Promise.all([
      getDoiSettings(prisma),
      prisma.publishedArticle.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          slug: true,
          title: true,
          doi: true,
          authors: true,
          publishedAt: true,
          isActive: true,
          journal: {
            select: {
              id: true,
              title: true,
              shortTitle: true,
              doiPrefix: true,
            },
          },
        },
        orderBy: [{ publishedAt: "desc" }],
      }),
      prisma.publishedArticle.count({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [{ doi: null }, { doi: "" }],
        },
      }),
    ]);

    const records = articles.map((a) => {
      const nid = a.doi ? normalizeNid(a.doi) : null;
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        authors: a.authors,
        doi: nid,
        nid,
        publishedAt: a.publishedAt.toISOString(),
        isActive: a.isActive,
        journal: a.journal,
        landingPath: nid ? nidPath(nid) : null,
        landingUrl: nid ? absoluteUrl(nidPath(nid)) : null,
        articleUrl: absoluteUrl(`/articles/${a.slug}`),
        scholarReady: Boolean(nid && a.isActive),
      };
    });

    return jsonOk({
      settings: {
        prefix: settings.prefix || DEFAULT_NID_PREFIX,
        label: settings.label,
        publisherName: settings.publisherName,
        notes: settings.notes,
      },
      records,
      missingCount,
      assignedCount: records.filter((r) => r.nid).length,
    });
  } catch (err) {
    console.error("[admin/nids GET]", err);
    return jsonError("Could not load NID registry", 500);
  }
}

const settingsSchema = z.object({
  kind: z.literal("settings"),
  prefix: z
    .string()
    .min(2)
    .max(32)
    .regex(
      /^[a-z0-9][a-z0-9._-]*$/i,
      "Prefix must be letters/numbers (e.g. nid)",
    ),
  label: z.string().min(2).max(80),
  publisherName: z.string().min(2).max(120),
  notes: z.string().max(2000).optional().nullable(),
});

const articleSchema = z.object({
  kind: z.literal("article"),
  id: z.string().min(1),
  doi: z.string().min(5),
});

const backfillSchema = z.object({
  kind: z.literal("backfill"),
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const raw = await request.json();
    const kind = z.enum(["settings", "article", "backfill"]).parse(raw.kind);

    if (kind === "settings") {
      const body = settingsSchema.parse(raw);
      const prefix = body.prefix.trim().replace(/\/+$/, "").toLowerCase();
      const settings = await prisma.doiSettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          prefix,
          label: body.label.trim(),
          publisherName: body.publisherName.trim(),
          notes: body.notes?.trim() || null,
        },
        update: {
          prefix,
          label: body.label.trim(),
          publisherName: body.publisherName.trim(),
          notes: body.notes?.trim() || null,
        },
      });
      return jsonOk({ settings });
    }

    if (kind === "backfill") {
      backfillSchema.parse(raw);
      const updated = await backfillMissingNids(prisma);
      return jsonOk({ updated });
    }

    const body = articleSchema.parse(raw);
    const nid = normalizeNid(body.doi);
    if (!isValidNidShape(nid)) {
      return jsonError("NID must look like nid/journal.year.####");
    }
    if (await isNidTaken(prisma, nid, body.id)) {
      return jsonError(`NID already in use: ${nid}`);
    }

    const article = await prisma.publishedArticle.update({
      where: { id: body.id },
      data: { doi: nid },
      select: {
        id: true,
        slug: true,
        title: true,
        doi: true,
      },
    });

    return jsonOk({
      article: {
        ...article,
        doi: article.doi ? normalizeNid(article.doi) : null,
        nid: article.doi ? normalizeNid(article.doi) : null,
        landingUrl: article.doi
          ? absoluteUrl(nidPath(article.doi))
          : null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[admin/nids PATCH]", err);
    return jsonError("Could not update NID registry", 500);
  }
}
