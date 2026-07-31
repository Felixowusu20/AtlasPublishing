"use client";

import {
  RealtimeNotifications,
  type AppNotification,
} from "@/components/realtime-notifications";

function adminHref(n: AppNotification) {
  if (!n.submissionId) return "/admin/submissions";
  const status = n.submission?.status;
  if (status === "ACCEPTED" || status === "IN_PRODUCTION") {
    return `/admin/manuscripts?id=${n.submissionId}`;
  }
  return `/admin/submissions/${n.submissionId}`;
}

export function AdminNotifications() {
  return (
    <RealtimeNotifications
      apiPath="/api/admin/notifications"
      storageKey="nahda-admin-notif"
      tagPrefix="nahda-admin"
      hrefFor={adminHref}
      enableLabel="Enable alerts"
    />
  );
}
