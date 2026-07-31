import Stripe from "stripe";
import { getAppBaseUrl } from "@/lib/app-url";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Add your Stripe secret key in Vercel env.",
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }
  return stripeClient;
}

/** Public site origin for Stripe success/cancel URLs. */
export function appBaseUrl() {
  return getAppBaseUrl();
}

export function stripeConfigured(): boolean {
  return Boolean((process.env.STRIPE_SECRET_KEY ?? "").trim());
}
