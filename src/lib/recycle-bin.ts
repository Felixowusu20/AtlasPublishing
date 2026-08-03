import type { Prisma } from "@/generated/prisma/client";
import { progressForStatus } from "@/lib/submission-utils";

type Tx = Prisma.TransactionClient;

/**
 * Soft-delete a published article into the recycle bin.
 * Disconnects the submission so production/publish queues work again.
 */
export async function trashPublishedArticle(
  tx: Tx,
  args: {
    articleId: string;
    deletedById?: string | null;
    forEdit?: boolean;
  },
) {
  const article = await tx.publishedArticle.findUnique({
    where: { id: args.articleId },
    select: {
      id: true,
      title: true,
      deletedAt: true,
      submissionId: true,
      submission: {
        select: {
          id: true,
          authorId: true,
          manuscriptId: true,
          title: true,
        },
      },
    },
  });

  if (!article) return null;
  if (article.deletedAt) return article;

  const submissionId = article.submissionId;
  const submission = article.submission;

  await tx.publishedArticle.update({
    where: { id: article.id },
    data: {
      deletedAt: new Date(),
      deletedById: args.deletedById ?? null,
      isActive: false,
      trashedSubmissionId: submissionId,
      submissionId: null,
    },
  });

  if (submissionId) {
    await tx.submission.update({
      where: { id: submissionId },
      data: {
        status: "IN_PRODUCTION",
        progress: progressForStatus("IN_PRODUCTION"),
      },
    });

    if (submission) {
      await tx.notification.create({
        data: {
          userId: submission.authorId,
          submissionId: submission.id,
          title: args.forEdit
            ? "Article returned to editing"
            : "Published article removed",
          body: args.forEdit
            ? `“${submission.title}” (${submission.manuscriptId}) was unpublished so editors can revise the full manuscript. It is no longer live on Nahda.`
            : `“${submission.title}” (${submission.manuscriptId}) was moved to the recycle bin and is no longer available to download.`,
        },
      });
    }
  }

  return {
    ...article,
    submissionId,
    submission,
  };
}

/** Soft-delete a submission (and its published article, if any) into the recycle bin. */
export async function trashSubmission(
  tx: Tx,
  args: {
    submissionId: string;
    deletedById?: string | null;
  },
) {
  const submission = await tx.submission.findUnique({
    where: { id: args.submissionId },
    select: {
      id: true,
      title: true,
      manuscriptId: true,
      authorId: true,
      deletedAt: true,
      publishedArticle: { select: { id: true, deletedAt: true } },
    },
  });

  if (!submission) return null;
  if (submission.deletedAt) return submission;

  if (submission.publishedArticle && !submission.publishedArticle.deletedAt) {
    await trashPublishedArticle(tx, {
      articleId: submission.publishedArticle.id,
      deletedById: args.deletedById,
    });
  }

  await tx.submission.update({
    where: { id: submission.id },
    data: {
      deletedAt: new Date(),
      deletedById: args.deletedById ?? null,
      actionRequired: null,
    },
  });

  await tx.notification.create({
    data: {
      userId: submission.authorId,
      submissionId: submission.id,
      title: "Submission removed",
      body: `“${submission.title}” (${submission.manuscriptId}) was removed by an editor and is no longer active.`,
    },
  });

  return submission;
}

/** Restore a published article from the recycle bin. */
export async function restorePublishedArticle(
  tx: Tx,
  articleId: string,
) {
  const article = await tx.publishedArticle.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      deletedAt: true,
      trashedSubmissionId: true,
      title: true,
    },
  });
  if (!article?.deletedAt) return null;

  let reconnectId = article.trashedSubmissionId;
  if (reconnectId) {
    const sub = await tx.submission.findUnique({
      where: { id: reconnectId },
      select: {
        id: true,
        deletedAt: true,
        publishedArticle: { select: { id: true } },
      },
    });
    // Don't reconnect if submission is trashed or already linked elsewhere
    if (!sub || sub.deletedAt || sub.publishedArticle) {
      reconnectId = null;
    }
  }

  await tx.publishedArticle.update({
    where: { id: article.id },
    data: {
      deletedAt: null,
      deletedById: null,
      isActive: true,
      submissionId: reconnectId,
      trashedSubmissionId: null,
    },
  });

  if (reconnectId) {
    await tx.submission.update({
      where: { id: reconnectId },
      data: {
        status: "PUBLISHED",
        progress: progressForStatus("PUBLISHED"),
        actionRequired: null,
      },
    });
  }

  return article;
}

/** Restore a submission from the recycle bin. */
export async function restoreSubmission(tx: Tx, submissionId: string) {
  const submission = await tx.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, deletedAt: true, title: true, manuscriptId: true },
  });
  if (!submission?.deletedAt) return null;

  await tx.submission.update({
    where: { id: submission.id },
    data: {
      deletedAt: null,
      deletedById: null,
    },
  });

  return submission;
}
