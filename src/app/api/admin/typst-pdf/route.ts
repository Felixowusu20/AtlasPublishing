import { z } from "zod";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { jsonError, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import {
  compileAtlasTypstPdf,
  type AtlasTypstInput,
} from "@/lib/typst-atlas";
import { prisma } from "@/lib/db";

const schema = z.object({
  submissionId: z.string().optional(),
  journalTitle: z.string().min(1),
  journalShortTitle: z.string().min(1),
  journalSlug: z.string().optional(),
  coverColor: z.string().optional(),
  articleSlug: z.string().optional(),
  siteBaseUrl: z.string().optional(),
  manuscriptId: z.string().min(1),
  title: z.string().min(2),
  authors: z.array(z.string()).min(1),
  affiliations: z.array(z.string()).optional(),
  abstract: z.string().min(10),
  keywords: z.array(z.string()).optional(),
  articleType: z.string().min(1),
  doi: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  license: z.string().optional(),
  openAccess: z.boolean().optional(),
  body: z.string().optional(),
  logoUrl: z.string().url().optional(),
  figures: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string().min(1),
        caption: z.string().optional(),
      }),
    )
    .optional(),
  upload: z.boolean().optional(),
});

/**
 * Generate a Nahda-branded Typst PDF.
 * - Default: returns application/pdf bytes for download/preview
 * - upload=true: stores on Cloudinary and returns { url, publicId }
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const body = schema.parse(await request.json());

    let receivedAt: string | undefined;
    let acceptedAt: string | undefined;
    let journalSlug = body.journalSlug;
    let coverColor = body.coverColor;
    let logoUrl = body.logoUrl;
    if (body.submissionId) {
      const sub = await prisma.submission.findUnique({
        where: { id: body.submissionId },
        select: {
          submittedAt: true,
          updatedAt: true,
          journal: {
            select: {
              slug: true,
              coverColor: true,
              coverImageUrl: true,
            },
          },
        },
      });
      if (sub) {
        receivedAt = sub.submittedAt.toISOString();
        acceptedAt = sub.updatedAt.toISOString();
        journalSlug = journalSlug || sub.journal.slug;
        coverColor = coverColor || sub.journal.coverColor;
        logoUrl = logoUrl || sub.journal.coverImageUrl || undefined;
      }
    }

    const input: AtlasTypstInput = {
      journalTitle: body.journalTitle,
      journalShortTitle: body.journalShortTitle,
      journalSlug,
      coverColor,
      articleSlug: body.articleSlug,
      siteBaseUrl:
        body.siteBaseUrl ||
        process.env.NEXT_PUBLIC_APP_URL ||
        undefined,
      manuscriptId: body.manuscriptId,
      title: body.title,
      authors: body.authors,
      affiliations: body.affiliations ?? [],
      abstract: body.abstract,
      keywords: body.keywords ?? [],
      articleType: body.articleType,
      doi: body.doi,
      volume: body.volume,
      issue: body.issue,
      pages: body.pages,
      license: body.license,
      openAccess: body.openAccess,
      body: body.body,
      figures: body.figures,
      logoUrl,
      receivedAt,
      acceptedAt,
      publishedAt: new Date().toISOString(),
    };

    const pdf = await compileAtlasTypstPdf(input);
    const filename = `${body.manuscriptId.replace(/[^A-Za-z0-9_-]+/g, "_")}.pdf`;

    if (body.upload) {
      const uploaded = await uploadToCloudinary(pdf, {
        folder: "atlas/published-pdfs",
        resourceType: "raw",
        filename,
      });
      return Response.json({
        url: uploaded.url,
        publicId: uploaded.publicId,
        bytes: pdf.length,
      });
    }

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[typst-pdf]", err);
    return jsonError(
      err instanceof Error ? err.message : "PDF generation failed",
      500,
    );
  }
}
