import { jsonError, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";

/** Paystack card charging is retired — APC is collected via PayPal. */
export async function POST() {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();
  return jsonError(
    "Card checkout via Paystack is no longer used. Please pay the APC by PayPal using the instructions on this page.",
    410,
  );
}
