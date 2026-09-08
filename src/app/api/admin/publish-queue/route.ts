import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, prismaFailureMessage } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { articlePublishedEmailHtml, sendEmailToAll } from "@/lib/mail";
import { requireAdmin } from "@/lib/session";
import {
  progressForStatus,
  slugify,
  articleDownloadPath,
  isTypesetPdfUrl,
} from "@/lib/submission-utils";
import { doiToUrl, nidPath, normalizeDoi } from "@/lib/doi";
import { allocateNextAtlasDoi } from "@/lib/doi-db";
import { getAppBaseUrl } from "@/lib/app-url";
import { validateScholarReadiness, issueKey } from "@/lib/seo/article-seo";
import { deriveIssueRecords, isPlaceholderIssue, numberedIssuePlacement } from "@/lib/issues";
import { persistNumberedIssues } from "@/lib/issue-catalog";
import { articleDateYear, parseArticleDate } from "@/lib/article-dates";
import { ensureManuscriptHtml, htmlToPlainText } from "@/lib/import-manuscript";
import { optionalIssn } from "@/lib/issn";
import {
  jointAuthorGreeting,
  notifyAuthorContacts,
} from "@/lib/author-contacts";

/** Accepted manuscripts waiting to be published into the journal template. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    await persistNumberedIssues();
    const [queue, recentlyPublished, issueSource] = await Promise.all([
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
            select: { id: true, name: true, email: true, institution: true, orcid: true },
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
      prisma.publishedArticle.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          volume: true,
          issue: true,
          publishedAt: true,
          journal: {
            select: {
              id: true,
              slug: true,
              title: true,
              shortTitle: true,
              frequency: true,
              foundedYear: true,
              issn: true,
            },
          },
        },
      }),
    ]);

    return jsonOk({
      queue,
      recentlyPublished,
      journalIssues: deriveIssueRecords(issueSource),
    });
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
  abstract: z.string().min(1),
  keywords: z.array(z.string()).optional(),
  articleType: z.string().min(1),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  issn: z.string().optional(),
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
  receivedAt: z.string().optional(),
  acceptedAt: z.string().optional(),
  publishedAt: z.string().optional(),
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
    // After "Unpublish & edit", the soft-deleted row still owns slug/DOI.
    // Republishing must restore that row instead of creating a duplicate.
    const previous = await prisma.publishedArticle.findFirst({
      where: {
        trashedSubmissionId: submission.id,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: "desc" },
    });

    if (previous && !body.slug?.trim()) {
      // Keep the original public URL when republishing after an edit pass.
      slug = previous.slug;
    } else {
      const slugTaken = await prisma.publishedArticle.findFirst({
        where: {
          slug,
          ...(previous ? { id: { not: previous.id } } : {}),
        },
        select: { id: true },
      });
      if (slugTaken) {
        slug =
          `${slug}-${submission.manuscriptId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(
            0,
            80,
          );
      }
    }

    const receivedAt = parseArticleDate(body.receivedAt);
    const acceptedAt = parseArticleDate(body.acceptedAt);
    const publishedAt = parseArticleDate(body.publishedAt) ?? new Date();
    const abstract = ensureManuscriptHtml(body.abstract);
    if (htmlToPlainText(abstract).trim().length < 10) {
      return jsonError("Add an abstract before publishing.");
    }
    const publishYear = articleDateYear(body.publishedAt);
    let doi = body.doi?.trim()
      ? normalizeDoi(body.doi)
      : previous?.doi
        ? previous.doi
        : null;
    if (!doi) {
      doi = await allocateNextAtlasDoi(prisma, submission.journal, publishYear);
    }

    const doiClash = await prisma.publishedArticle.findFirst({
      where: {
        doi,
        ...(previous ? { id: { not: previous.id } } : {}),
      },
      select: { id: true, deletedAt: true },
    });
    if (doiClash) {
      return jsonError(`NID already in use: ${doi}`, 400);
    }

    const publishedPdfUrl =
      body.pdfUrl && isTypesetPdfUrl(body.pdfUrl)
        ? body.pdfUrl
        : previous?.manuscriptUrl && isTypesetPdfUrl(previous.manuscriptUrl)
          ? previous.manuscriptUrl
          : null;
    if (!publishedPdfUrl) {
      return jsonError(
        "Generate the Nahda-styled PDF from the article template before publishing. The original Word or Google Docs file is not used as the public download.",
        400,
      );
    }

    const placement = numberedIssuePlacement({
      publishedAt,
      frequency: submission.journal.frequency,
      foundedYear: submission.journal.foundedYear,
    });
    const volume =
      body.volume?.trim() && body.volume.trim() !== "—"
        ? body.volume.trim()
        : placement.volume;
    const issue = isPlaceholderIssue(body.issue)
      ? placement.issue
      : body.issue!.trim();

    const articleData = {
      title: body.title,
      slug,
      doi,
      authors: body.authors,
      affiliations: body.affiliations ?? [],
      journalId: submission.journalId,
      submissionId: submission.id,
      publishedAt,
      receivedAt: receivedAt ?? null,
      acceptedAt: acceptedAt ?? null,
      volume,
      issue,
      pages: body.pages || undefined,
      articleType: body.articleType,
      openAccess: body.openAccess ?? true,
      license: body.license || "CC BY 4.0",
      abstract,
      keywords: body.keywords ?? submission.keywords,
      manuscriptUrl: publishedPdfUrl,
      coverImageUrl:
        body.coverImageUrl || submission.journal.coverImageUrl || undefined,
      isFeatured: body.isFeatured ?? true,
      isActive: true,
      deletedAt: null as Date | null,
      deletedById: null as string | null,
      trashedSubmissionId: null as string | null,
    };

    const result = await prisma.$transaction(
      async (tx) => {
        if (body.issn !== undefined) {
          await tx.journal.update({
            where: { id: submission.journalId },
            data: { issn: optionalIssn(body.issn) },
          });
        }

        const article = previous
          ? await tx.publishedArticle.update({
              where: { id: previous.id },
              data: articleData,
              include: { journal: true },
            })
          : await tx.publishedArticle.create({
              data: articleData,
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
            title: "Congratulations! Your article is published",
            body: `We’re delighted to share that “${article.title}” is now live in ${article.journal.title}. Open your dashboard to download the final PDF, or visit /articles/${article.slug}.`,
          },
        });

        return article;
      },
      { maxWait: 20_000, timeout: 45_000 },
    );

    const base = getAppBaseUrl();
    const articleUrl = `${base}/articles/${result.slug}`;
    const doiUrl = result.doi ? `${base}${nidPath(result.doi)}` : null;
    const pdfDownloadUrl = publishedPdfUrl
      ? `${base}${articleDownloadPath(result.slug)}`
      : null;

    const scholar = validateScholarReadiness({
      title: result.title,
      authors: result.authors,
      abstract: result.abstract,
      publishedAt: result.publishedAt,
      journalTitle: result.journal.title,
      issn: result.journal.issn,
      eIssn: result.journal.eIssn,
      doi: result.doi,
      manuscriptUrl: publishedPdfUrl ?? result.manuscriptUrl,
      slug: result.slug,
    });

    // Refresh SEO surfaces so Google/Scholar discover the new article promptly.
    try {
      revalidatePath(`/articles/${result.slug}`);
      revalidatePath(`/journals/${result.journal.slug}`);
      revalidatePath(
        `/journals/${result.journal.slug}/issues/${issueKey(result.volume, result.issue)}`,
      );
      if (result.doi) revalidatePath(nidPath(result.doi));
      revalidatePath("/articles");
      revalidatePath("/articles/current-issues");
      revalidatePath("/articles/past-issues");
      revalidatePath("/sitemap.xml");
    } catch (err) {
      console.error("[publish-revalidate]", err);
    }

    let emailSent = false;
    try {
      const contacts = notifyAuthorContacts({
        authorsJson: submission.authorsJson,
        fallback: {
          name: submission.author.name,
          email: submission.author.email,
        },
      });
      const greeting = jointAuthorGreeting(contacts);
      const mail = await sendEmailToAll(
        contacts.map((c) => c.email),
        {
          subject: `Congratulations! “${result.title}” is published`,
          html: articlePublishedEmailHtml({
            authorName: greeting,
            title: result.title,
            manuscriptId: submission.manuscriptId,
            journalTitle: result.journal.title,
            articleUrl,
            pdfUrl: pdfDownloadUrl,
          }),
        },
      );
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
      scholar,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[publish-queue POST]", err);
    return jsonError(
      prismaFailureMessage(err, "Could not publish article"),
      500,
    );
  }
}
