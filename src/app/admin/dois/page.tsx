import { redirect } from "next/navigation";

/** Legacy admin path — DOI registry renamed to NID. */
export default function LegacyDoisAdminRedirect() {
  redirect("/admin/nids");
}
