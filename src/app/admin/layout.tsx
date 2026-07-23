import type { ReactNode } from "react";
import { AdminAuthProvider } from "@/components/admin-auth-provider";
import { AdminShell } from "@/components/admin-shell";

export const metadata = {
  title: "Atlas Admin",
  description: "Atlas Academic Publishing administration",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
