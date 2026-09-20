import { NahdaLoader } from "@/components/nahda-loader";

/** Light route transition — avoid a full blank-feeling screen on soft nav. */
export default function Loading() {
  return <NahdaLoader variant="panel" label="Loading…" className="min-h-[40vh]" />;
}
