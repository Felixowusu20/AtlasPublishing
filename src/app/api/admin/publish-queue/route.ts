import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { articlePublishedEmailHtml, sendEmail } from "@/lib/mail";
import { requireAdmin } from "@/lib/session";
import {
  progressForStatus,
  slugify,
  articleDownloadPath,
} from "@/lib/submission-utils";
import { compileAtlasTypstPdf } from "@/lib/typst-atlas";
import {
  allocateNextAtlasDoi,
  atlasDoiPath,
  doiToUrl,
  normalizeDoi,
} from "@/lib/doi";
import { getAppBaseUrl } from "@/lib/app-url";

/** Accepted manuscripts waiting to be published into the journal template. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const [queue, recentlyPublished] = await Promise.all([
      prisma.submission.findMany({
        where: {
          deletedAt: null,
          status: { in: ["ACCEPTED", "IN_PRODUCTION"] },
          publishedArticle: null,
          apcPaymentStatus: { in: ["PAID", "WAIVED", "NOT_REQUIRED"] },
        },
        include: {
          journal: true,
          author: {
            select: { id: true, name: true, email: true, institution: true },
          },
          payment: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.publishedArticle.findMany({
        where: { deletedAt: null },
        include: {
          journal: true,
          submission: {
            select: {
              id: true,
              manuscriptId: true,
              author: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: 40,
      }),
    ]);

    return jsonOk({ queue, recentlyPublished });
  } catch (err) {
    console.error("[publish-queue GET]", err);
    return jsonError("Could not load publish queue", 500);
  }
}

const publishSchema = z.object({
  submissionId: z.string().min(1),
  title: z.string().min(2),
  slug: z.string().optional(),
  doi: z.string().optional(),
  authors: z.array(z.string()).min(1),
  affiliations: z.array(z.string()).optional(),
  abstract: z.string().min(10),
  keywords: z.array(z.string()).optional(),
  articleType: z.string().min(1),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  license: z.string().optional(),
  openAccess: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  coverImageUrl: z.string().optional(),
  body: z.string().optional(),
  figures: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string().min(1),
        caption: z.string().optional(),
      }),
    )
    .optional(),
  pdfUrl: z.string().url().optional(),
  acceptedAt: z.string().optional(),
  receivedAt: z.string().optional(),
});

/**
 * Publish an accepted submission: create PublishedArticle, mark PUBLISHED,
 * notify + email the author with congratulations and the public paper link.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const body = publishSchema.parse(await request.json());

    const submission = await prisma.submission.findUnique({
      where: { id: body.submissionId },
      include: {
        journal: true,
        author: true,
        publishedArticle: true,
      },
    });

    if (!submission) return jsonError("Submission not found", 404);
    if (submission.publishedArticle) {
      return jsonError("This manuscript is already published", 400);
    }
    if (
      submission.status !== "ACCEPTED" &&
      submission.status !== "IN_PRODUCTION"
    ) {
      return jsonError(
        "Only accepted manuscripts can be published from this queue.",
        400,
      );
    }
    if (
      submission.apcPaymentStatus !== "PAID" &&
      submission.apcPaymentStatus !== "WAIVED" &&
      submission.apcPaymentStatus !== "NOT_REQUIRED"
    ) {
      return jsonError(
        "APC payment is still pending. Publish is blocked until payment or waiver.",
        400,
      );
    }

    let slug = (body.slug?.trim() || slugify(body.title)).slice(0, 80);
    const existing = await prisma.publishedArticle.findUnique({
      where: { slug },
    });
    if (existing) {
      slug =
        `${slug}-${submission.manuscriptId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(
          0,
          80,
        );
    }

    const acceptedAt = body.acceptedAt ? new Date(body.acceptedAt) : new Date();
    const receivedAt = body.receivedAt
      ? new Date(body.receivedAt)
      : submission.submittedAt;

    const publishYear = acceptedAt.getFullYear();
    let doi = body.doi?.trim() ? normalizeDoi(body.doi) : null;
    if (!doi) {
      doi = await allocateNextAtlasDoi(prisma, submission.journal, publishYear);
    }

    const doiClash = await prisma.publishedArticle.findFirst({
      where: { doi },
    });
    if (doiClash) {
      return jsonError(`DOI already in use: ${doi}`, 400);
    }

    // Prefer client-provided PDF URL, otherwise generate Nahda Typst PDF now
    let publishedPdfUrl = body.pdfUrl || null;
    if (!publishedPdfUrl) {
      try {
        const pdf = await compileAtlasTypstPdf({
          journalTitle: submission.journal.title,
          journalShortTitle: submission.journal.shortTitle,
          journalSlug: submission.journal.slug,
          coverColor: submission.journal.coverColor,
          articleSlug: slug,
          siteBaseUrl: process.env.NEXT_PUBLIC_APP_URL
            ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
            : getAppBaseUrl(),
          manuscriptId: submission.manuscriptId,
          title: body.title,
          authors: body.authors,
          affiliations: body.affiliations ?? [],
          abstract: body.abstract,
          keywords: body.keywords ?? submission.keywords,
          articleType: body.articleType,
          doi,
          volume: body.volume,
          issue: body.issue,
          pages: body.pages,
          license: body.license,
          openAccess: body.openAccess,
          body: body.body,
          figures: body.figures,
          logoUrl: body.coverImageUrl || submission.journal.coverImageUrl || undefined,
          receivedAt: receivedAt.toISOString(),
          acceptedAt: acceptedAt.toISOString(),
          publishedAt: new Date().toISOString(),
        });
        const uploaded = await uploadToCloudinary(pdf, {
          folder: "atlas/published-pdfs",
          resourceType: "raw",
          filename: `${submission.manuscriptId}.pdf`,
        });
        publishedPdfUrl = uploaded.url;
      } catch (err) {
        console.error("[publish typst-pdf]", err);
        return jsonError(
          err instanceof Error
            ? `PDF generation failed: ${err.message}`
            : "PDF generation failed",
          500,
        );
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const article = await tx.publishedArticle.create({
          data: {
            title: body.title,
            slug,
            doi,
            authors: body.authors,
            affiliations: body.affiliations ?? [],
            journalId: submission.journalId,
            submissionId: submission.id,
            publishedAt: new Date(),
            receivedAt,
            acceptedAt,
            volume: body.volume || undefined,
            issue: body.issue || "Early View",
            pages: body.pages || undefined,
            articleType: body.articleType,
            openAccess: body.openAccess ?? true,
            license: body.license || "CC BY 4.0",
            abstract: body.abstract,
            keywords: body.keywords ?? submission.keywords,
            // Downloadable Nahda-formatted PDF (Typst)
            manuscriptUrl: publishedPdfUrl,
            coverImageUrl:
              body.coverImageUrl ||
              submission.journal.coverImageUrl ||
              undefined,
            isFeatured: body.isFeatured ?? true,
            isActive: true,
          },
          include: { journal: true },
        });

        await tx.submission.update({
          where: { id: submission.id },
          data: {
            status: "PUBLISHED",
            progress: progressForStatus("PUBLISHED"),
            actionRequired: null,
          },
        });

        await tx.notification.create({
          data: {
            userId: submission.authorId,
            submissionId: submission.id,
            title: "Your article is published",
            body: `Congratulations! “${article.title}” is now live in ${article.journal.title}. Open your dashboard to download the final PDF, or visit /articles/${article.slug}.`,
          },
        });

        return article;
      },
      { maxWait: 20_000, timeout: 30_000 },
    );

    const base = getAppBaseUrl();
    const articleUrl = `${base}/articles/${result.slug}`;
    const doiUrl = result.doi ? `${base}${atlasDoiPath(result.doi)}` : null;
    const pdfDownloadUrl = publishedPdfUrl
      ? `${base}${articleDownloadPath(result.slug)}`
      : null;

    let emailSent = false;
    try {
      const mail = await sendEmail({
        to: submission.author.email,
        subject: `Published: “${result.title}”`,
        html: articlePublishedEmailHtml({
          authorName: submission.author.name,
          title: result.title,
          manuscriptId: submission.manuscriptId,
          journalTitle: result.journal.title,
          articleUrl,
          pdfUrl: pdfDownloadUrl,
        }),
      });
      emailSent = Boolean(mail.ok);
    } catch (err) {
      console.error("[publish-email]", err);
    }

    return jsonCreated({
      article: result,
      articleUrl,
      doi: result.doi,
      doiUrl: result.doi ? doiToUrl(result.doi) : null,
      atlasDoiUrl: doiUrl,
      pdfUrl: publishedPdfUrl,
      downloadUrl: pdfDownloadUrl,
      emailSent,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not publish article", 500);
  }
}
