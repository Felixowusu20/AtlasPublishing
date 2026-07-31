"use client";

import {
  RealtimeNotifications,
  type AppNotification,
} from "@/components/realtime-notifications";

function authorHref(n: AppNotification) {
  const published = n.submission?.publishedArticle;
  const isPublished =
    n.submission?.status === "PUBLISHED" ||
    n.title.toLowerCase().includes("published");

  if (isPublished && published?.slug) {
    return `/articles/${published.slug}`;
  }
  if (n.submissionId) return `/submissions/${n.submissionId}`;
  return "/notifications";
}

export function AuthorNotifications() {
  return (
    <RealtimeNotifications
      apiPath="/api/notifications"
      storageKey="nahda-author-notif"
      tagPrefix="nahda-author"
      hrefFor={authorHref}
      enableLabel="Enable alerts"
      allLink="/notifications"
    />
  );
}
