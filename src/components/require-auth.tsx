"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.replace("/login?next=" + encodeURIComponent(window.location.pathname));
    }
  }, [ready, user, router]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-sm text-[var(--muted)]">
        Loading session…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-sm text-[var(--muted)]">
        Redirecting to login…
      </div>
    );
  }

  return <>{children}</>;
}
