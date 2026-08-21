/** Paystack Charge / verify statuses → Nahda checkout steps. */

export type ChargeAuthPhase = "start" | "auth" | "check";

export function isPaystackChargePaid(data: {
  status?: string | null;
  gateway_response?: string | null;
  paid_at?: string | null;
}): boolean {
  const status = (data.status || "").toLowerCase();
  if (status === "success" || status === "successful" || status === "paid") {
    return true;
  }
  if (data.paid_at) return true;
  return false;
}

/**
 * Map a Paystack charge payload to a checkout status.
 *
 * Bank 3DS (`open_url`) uses the same Nahda OTP fields as `send_otp`.
 * The customer never sees the bank 3DS page — they type the live bank OTP here.
 */
export function mapPaystackAuthStatus(
  data: {
    status?: string | null;
    url?: string | null;
    message?: string | null;
    display_text?: string | null;
    gateway_response?: string | null;
    paid_at?: string | null;
  },
  _phase: ChargeAuthPhase,
): { status: string; paid: boolean } {
  if (isPaystackChargePaid(data)) {
    return { status: "success", paid: true };
  }

  let status = (data.status || "").toLowerCase();
  const raw = `${data.display_text || ""} ${data.message || ""} ${data.gateway_response || ""}`;
  const abandoned =
    status === "abandoned" || /authorization was abandoned/i.test(raw);

  if (status === "open_url" || (abandoned && data.url)) {
    return { status: "send_otp", paid: false };
  }

  if (
    status === "send_otp" ||
    status === "send_pin" ||
    status === "send_phone" ||
    status === "send_birthday"
  ) {
    return { status, paid: false };
  }

  if (abandoned) {
    if (_phase === "check") return { status: "pending", paid: false };
    return { status: "abandoned", paid: false };
  }

  if (!status) status = "pending";
  return { status, paid: false };
}
