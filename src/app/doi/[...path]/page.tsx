import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ download?: string }>;
};

/** Legacy /doi/… URLs redirect to the Nahda Identifier path /nid/… */
export default async function LegacyDoiRedirect({
  params,
  searchParams,
}: Props) {
  const { path } = await params;
  const { download } = await searchParams;
  const joined = path.map(encodeURIComponent).join("/");
  const qs = download === "1" ? "?download=1" : "";
  redirect(`/nid/${joined}${qs}`);
}
