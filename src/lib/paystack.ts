import { getAppBaseUrl } from "@/lib/app-url";
import { NAHDA_MERCHANT_NAME } from "@/lib/payment-display";
import {
  INTERNAL_PAYSTACK_CURRENCY,
  formatCustomerUsd,
  internalPaystackCurrency,
  usdToGhsRate,
} from "@/lib/payment-currency";

const PAYSTACK_BASE = "https://api.paystack.co";

export function appBaseUrl() {
  return getAppBaseUrl();
}

export function paystackConfigured(): boolean {
  return Boolean(cleanSecret(process.env.PAYSTACK_SECRET_KEY));
}

/** Strip inline comments / quotes from .env values. */
function cleanSecret(raw: string | undefined): string {
  return (raw ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .split(/\s+#/)[0]!
    .trim();
}

export function getPaystackSecretKey(): string {
  const key = cleanSecret(process.env.PAYSTACK_SECRET_KEY);
  if (!key) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured. Add your Paystack secret key in env.",
    );
  }
  return key;
}

/**
 * Internal Paystack processing currency. Defaults to GHS.
 * Customer-facing UI never uses this value.
 */
export function paystackCurrency(): string {
  return internalPaystackCurrency();
}

function fxPerUsd(currency: string): number {
  const code = currency.toUpperCase();
  if (code === "GHS") return usdToGhsRate();

  const envKey = `PAYSTACK_${code}_PER_USD`;
  const fromEnv = Number(process.env[envKey]);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  switch (code) {
    case "NGN":
      return Number(process.env.PAYSTACK_NGN_PER_USD ?? "1600") || 1600;
    case "KES":
      return Number(process.env.PAYSTACK_KES_PER_USD ?? "130") || 130;
    case "ZAR":
      return Number(process.env.PAYSTACK_ZAR_PER_USD ?? "18") || 18;
    case "XOF":
      return Number(process.env.PAYSTACK_XOF_PER_USD ?? "600") || 600;
    case "USD":
      return 1;
    default:
      return 1;
  }
}

/**
 * Convert trusted USD cents → Paystack subunit for the internal currency.
 * GHS uses pesewas: usdMajor × rate × 100.
 */
export function usdToPaystackAmount(usdCents: number, currency: string): number {
  const code = currency.toUpperCase();
  if (code === "USD") return Math.max(0, Math.round(usdCents));
  const major = usdCents / 100;
  const localMajor = major * fxPerUsd(code);
  return Math.max(0, Math.round(localMajor * 100));
}

/**
 * Backend-only: USD customer price → internal Paystack amount.
 * The returned `label` is always the customer USD label.
 */
export function resolvePaystackCharge(
  usdCents: number,
  currencyOverride?: string,
): {
  amount: number;
  currency: string;
  label: string;
  usdCents: number;
  exchangeRate: number;
} {
  const currency = (currencyOverride || paystackCurrency()).toUpperCase();
  return {
    amount: usdToPaystackAmount(usdCents, currency),
    currency,
    label: formatCustomerUsd(usdCents),
    usdCents,
    exchangeRate: fxPerUsd(currency),
  };
}

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type PaystackInitializeData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type PaystackVerifyData = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  gateway_response?: string;
  channel?: string;
  customer?: { email?: string | null };
  metadata?: Record<string, unknown> | string | null;
  receipt_number?: string | null;
};

async function paystackFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack request failed (${res.status})`);
  }
  return json.data;
}

export function isCurrencyUnsupported(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /currency not supported/i.test(msg);
}

/**
 * Internal Paystack currencies only. Charge only what this merchant actually
 * supports (GHS for Ghana). Never fall back to NGN/KES/etc.
 */
export function gatewayCurrencyAttempts(
  usdCents: number,
  merchantCurrencies: string[],
): Array<{ currency: string; amount: number }> {
  const merchant = merchantCurrencies
    .map((c) => c.toUpperCase())
    .filter((code) => code && code !== "USD");

  const ordered: string[] = [];
  const push = (c: string) => {
    const code = c.toUpperCase();
    if (!code || code === "USD") return;
    if (!ordered.includes(code)) ordered.push(code);
  };

  if (merchant.length > 0) {
    if (merchant.includes("GHS")) push("GHS");
    for (const code of merchant) push(code);
  } else {
    push(INTERNAL_PAYSTACK_CURRENCY);
    push("GHS");
  }

  const seen = new Set<string>();
  const attempts: Array<{ currency: string; amount: number }> = [];
  for (const currency of ordered) {
    const converted = usdToPaystackAmount(usdCents, currency);
    const amount = Math.max(100, converted);
    const key = `${currency}:${amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    attempts.push({ currency, amount });
  }
  return attempts;
}

function unsupportedCurrencyError(lastError: unknown, supported: string): Error {
  const detail =
    lastError instanceof Error ? lastError.message : "Currency not supported";
  return new Error(
    `${detail}. This Paystack business supports: ${supported}. Enable GHS under Paystack Dashboard → Settings → Preferences → Currency.`,
  );
}

/** Currencies enabled on this Paystack business (from /balance). */
export async function getMerchantCurrencies(): Promise<string[]> {
  try {
    const data = await paystackFetch<Array<{ currency?: string }>>("/balance");
    const codes = (data ?? [])
      .map((b) => (b.currency ?? "").toUpperCase())
      .filter(Boolean);
    return [...new Set(codes)];
  } catch (err) {
    console.warn("[paystack] could not read merchant balances", err);
    return [];
  }
}

/**
 * Start Paystack hosted checkout. Amount/currency sent to Paystack are internal
 * (GHS). Do not overlay or alter Paystack's hosted checkout UI.
 */
export async function initializePaystackTransaction(opts: {
  email: string;
  usdCents: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<
  PaystackInitializeData & {
    chargedAmount: number;
    chargedCurrency: string;
    exchangeRate: number;
  }
> {
  const merchantCurrencies = await getMerchantCurrencies();
  const attempts = gatewayCurrencyAttempts(opts.usdCents, merchantCurrencies);

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const body: Record<string, unknown> = {
        email: opts.email,
        amount: String(attempt.amount),
        currency: attempt.currency,
        reference: opts.reference,
        callback_url: opts.callbackUrl,
        channels: ["card"],
        metadata: {
          ...opts.metadata,
          usdCents: String(opts.usdCents),
          merchant: NAHDA_MERCHANT_NAME,
          cancel_action: opts.callbackUrl.replace(
            "payment=success",
            "payment=cancelled",
          ),
        },
      };

      const data = await paystackFetch<PaystackInitializeData>(
        "/transaction/initialize",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      console.info(
        `[paystack] checkout initialized internally in ${attempt.currency}`,
      );

      return {
        ...data,
        chargedAmount: attempt.amount,
        chargedCurrency: attempt.currency,
        exchangeRate: fxPerUsd(attempt.currency),
      };
    } catch (err) {
      lastError = err;
      if (!isCurrencyUnsupported(err)) throw err;
      console.warn(
        `[paystack] ${attempt.currency} not supported — trying next`,
      );
    }
  }

  const supported =
    merchantCurrencies.length > 0
      ? merchantCurrencies.join(", ")
      : "unknown (check Paystack Dashboard → Settings → Preferences → Currency)";

  throw unsupportedCurrencyError(lastError, supported);
}

export async function verifyPaystackTransaction(
  reference: string,
): Promise<PaystackVerifyData> {
  return paystackFetch<PaystackVerifyData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

export async function verifyPaystackTransactionSafe(
  reference: string,
): Promise<PaystackVerifyData | null> {
  try {
    return await verifyPaystackTransaction(reference);
  } catch {
    return null;
  }
}

export function makePaystackReference(paymentId: string): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `nahda_${paymentId.slice(0, 12)}_${stamp}_${rand}`;
}

/** Response shape from Paystack Charge API (card / continue auth). */
export type PaystackChargeData = {
  reference: string;
  status: string;
  display_text?: string | null;
  message?: string | null;
  gateway_response?: string | null;
  amount?: number;
  currency?: string;
  url?: string | null;
  paid_at?: string | null;
  customer?: { email?: string | null };
  metadata?: Record<string, unknown> | string | null;
};

export type ChargeCardInput = {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  card: {
    number: string;
    cvv: string;
    expiry_month: string;
    expiry_year: string;
  };
  metadata?: Record<string, string>;
};

/**
 * Direct card charge (custom Nahda checkout). Card data is forwarded to Paystack
 * only — never persisted. May return send_pin / send_otp / open_url / success.
 */
export async function chargePaystackCard(
  input: ChargeCardInput,
): Promise<PaystackChargeData> {
  const body: Record<string, unknown> = {
    email: input.email,
    amount: String(input.amount),
    currency: input.currency,
    reference: input.reference,
    card: {
      number: input.card.number.replace(/\s+/g, ""),
      cvv: input.card.cvv,
      expiry_month: input.card.expiry_month.padStart(2, "0"),
      expiry_year: normalizeExpiryYear(input.card.expiry_year),
    },
  };
  if (input.metadata) {
    body.metadata = {
      ...input.metadata,
      merchant: input.metadata.merchant || NAHDA_MERCHANT_NAME,
    };
  }

  return paystackFetchAllowPending<PaystackChargeData>("/charge", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Charge a card in the merchant’s enabled currency (GHS for Ghana).
 * Customer checkout/receipts still show the original USD APC.
 */
export async function chargePaystackInSupportedCurrency(opts: {
  email: string;
  usdCents: number;
  paymentId: string;
  card: ChargeCardInput["card"];
  metadata?: Record<string, string>;
  persistReference: (reference: string) => Promise<void>;
}): Promise<
  PaystackChargeData & {
    chargedAmount: number;
    chargedCurrency: string;
    reference: string;
  }
> {
  const merchantCurrencies = await getMerchantCurrencies();
  const attempts = gatewayCurrencyAttempts(opts.usdCents, merchantCurrencies);
  const usdLabel = formatCustomerUsd(opts.usdCents);
  let lastError: unknown;

  for (const attempt of attempts) {
    const reference = makePaystackReference(opts.paymentId);
    await opts.persistReference(reference);
    try {
      const data = await chargePaystackCard({
        email: opts.email,
        amount: attempt.amount,
        currency: attempt.currency,
        reference,
        card: opts.card,
        metadata: opts.metadata,
      });
      if (
        isCurrencyUnsupported(data.message) ||
        isCurrencyUnsupported(data.gateway_response) ||
        isCurrencyUnsupported(data.display_text)
      ) {
        lastError = new Error(
          data.message || data.gateway_response || "Currency not supported",
        );
        console.warn(
          `[paystack] ${attempt.currency} not supported — trying next`,
        );
        continue;
      }
      console.info(
        `[paystack] charged in ${attempt.currency} (APC ${usdLabel} USD)`,
      );
      return {
        ...data,
        chargedAmount: attempt.amount,
        chargedCurrency: attempt.currency,
        reference: data.reference || reference,
      };
    } catch (err) {
      lastError = err;
      if (!isCurrencyUnsupported(err)) throw err;
      console.warn(
        `[paystack] ${attempt.currency} not supported — trying next`,
      );
    }
  }

  const supported =
    merchantCurrencies.length > 0
      ? merchantCurrencies.join(", ")
      : "unknown (check Paystack Dashboard → Settings → Preferences → Currency)";
  throw unsupportedCurrencyError(lastError, supported);
}

export async function submitPaystackPin(opts: {
  reference: string;
  pin: string;
}): Promise<PaystackChargeData> {
  return paystackFetchAllowPending<PaystackChargeData>("/charge/submit_pin", {
    method: "POST",
    body: JSON.stringify({ reference: opts.reference, pin: opts.pin }),
  });
}

export async function submitPaystackOtp(opts: {
  reference: string;
  otp: string;
}): Promise<PaystackChargeData> {
  return paystackFetchAllowPending<PaystackChargeData>("/charge/submit_otp", {
    method: "POST",
    body: JSON.stringify({ reference: opts.reference, otp: opts.otp }),
  });
}

export async function submitPaystackBirthday(opts: {
  reference: string;
  birthday: string;
}): Promise<PaystackChargeData> {
  return paystackFetchAllowPending<PaystackChargeData>(
    "/charge/submit_birthday",
    {
      method: "POST",
      body: JSON.stringify({
        reference: opts.reference,
        birthday: opts.birthday,
      }),
    },
  );
}

export async function submitPaystackPhone(opts: {
  reference: string;
  phone: string;
}): Promise<PaystackChargeData> {
  return paystackFetchAllowPending<PaystackChargeData>("/charge/submit_phone", {
    method: "POST",
    body: JSON.stringify({ reference: opts.reference, phone: opts.phone }),
  });
}

export async function checkPaystackCharge(
  reference: string,
): Promise<PaystackChargeData> {
  const verified = await verifyPaystackTransactionSafe(reference);
  if (verified) {
    return {
      reference: verified.reference || reference,
      status: verified.status,
      gateway_response: verified.gateway_response ?? null,
      amount: verified.amount,
      currency: verified.currency,
      paid_at: verified.paid_at ?? null,
      message: verified.gateway_response ?? null,
      url: null,
      customer: verified.customer,
      metadata: verified.metadata,
    };
  }
  return paystackFetchAllowPending<PaystackChargeData>(
    `/charge/${encodeURIComponent(reference)}`,
  );
}

function normalizeExpiryYear(year: string): string {
  const y = year.trim();
  if (y.length === 2) return `20${y}`;
  return y;
}

/**
 * Charge endpoints often return HTTP 200 with status:true even when the card
 * still needs PIN/OTP. Some auth steps return status:false with data — handle both.
 */
async function paystackFetchAllowPending<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await res.json()) as PaystackResponse<T> & {
    data?: T & { status?: string; message?: string };
  };

  // Successful charge or intermediate auth step
  if (json.status && json.data) return json.data;

  // PIN / OTP / 3DS often arrive with status:false but still include data
  if (json.data && typeof json.data === "object") {
    const data = json.data as T & {
      status?: string;
      url?: string | null;
      reference?: string;
      message?: string;
    };
    const st = (data.status || "").toLowerCase();
    if (
      data.reference ||
      data.url ||
      st === "abandoned" ||
      st === "send_otp" ||
      st === "send_pin" ||
      st === "send_phone" ||
      st === "send_birthday" ||
      st === "open_url" ||
      st === "pending"
    ) {
      return json.data;
    }
  }

  const message = json.message || `Paystack charge failed (${res.status})`;
  if (/authorization was abandoned/i.test(message)) {
    const data = (json.data || {}) as T & {
      url?: string | null;
      reference?: string;
      status?: string;
    };
    return {
      ...data,
      status: data.status || "abandoned",
      url: data.url ?? null,
    } as T;
  }

  throw new Error(message);
}
