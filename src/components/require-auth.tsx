"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { NahdaLoader } from "@/components/nahda-loader";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace("/login?next=" + encodeURIComponent(next));
    }
  }, [ready, user, router]);

  if (!ready) {
    return <NahdaLoader variant="screen" label="Loading your session…" />;
  }

  if (!user) {
    return <NahdaLoader variant="screen" label="Redirecting to login…" />;
  }

  return <>{children}</>;
}
