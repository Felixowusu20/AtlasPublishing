import { NahdaLoader } from "@/components/nahda-loader";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1f33]">
      <NahdaLoader variant="dark" label="Loading admin…" />
    </div>
  );
}
