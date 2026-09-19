import { NextResponse } from "next/server";

/** Paystack webhooks are retired — APC is confirmed manually after PayPal. */
export async function POST() {
  return NextResponse.json(
    { error: "Paystack webhooks are disabled. APC is paid via PayPal." },
    { status: 410 },
  );
}
