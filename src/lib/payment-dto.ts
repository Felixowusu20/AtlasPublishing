import { parseApcAmountCents } from "@/lib/apc";
import { z } from "zod";
import {
  CUSTOMER_CURRENCY,
  formatCustomerUsd,
  formatInternalGhs,
  customerUsdMajor,
} from "@/lib/payment-currency";

export const customerCheckoutRequestSchema = z.object({
  submissionId: z.string().min(1),
});

export type CustomerPaymentResponse = {
  paymentId: string;
  amount: number;
  amountCents: number;
  currency: typeof CUSTOMER_CURRENCY;
  amountLabel: string;
  status: string;
};

export type CustomerCheckoutResponse = CustomerPaymentResponse & {
  productName?: string;
  authorizationUrl?: string | null;
  alreadyCleared?: boolean;
};

export type AdminPaymentResponse = CustomerPaymentResponse & {
  internalAmount: number | null;
  internalCurrency: string | null;
  internalAmountLabel: string | null;
  exchangeRate: number | null;
  paystackReference: string | null;
  paidAt: Date | string | null;
  waivedAt: Date | string | null;
};

type PaymentLike = {
  id: string;
  amountCents: number;
  status: string;
  internalAmount?: number | null;
  internalCurrency?: string | null;
  exchangeRate?: number | null;
  paystackReference?: string | null;
  paidAt?: Date | string | null;
  waivedAt?: Date | string | null;
};

type JournalApcLike = {
  apc?: string | null;
  openAccess?: boolean;
};

/** Pending/unpaid APC follows the current journal fee, not a stale stored amount. */
export function livePendingApcCents(
  journal: JournalApcLike | null | undefined,
  payment: PaymentLike | null | undefined,
  apcPaymentStatus?: string | null,
): number | null {
  if (
    apcPaymentStatus === "PAID" ||
    apcPaymentStatus === "WAIVED" ||
    payment?.status === "PAID" ||
    payment?.status === "WAIVED"
  ) {
    return payment?.amountCents ?? null;
  }
  if (!journal) return payment?.amountCents ?? null;
  if (
    apcPaymentStatus === "PENDING" ||
    apcPaymentStatus === "NOT_REQUIRED" ||
    payment?.status === "PENDING" ||
    payment?.status === "NOT_REQUIRED"
  ) {
    return parseApcAmountCents(journal.apc, { openAccess: journal.openAccess });
  }
  return payment?.amountCents ?? null;
}

export function toCustomerPayment(
  payment: PaymentLike | null | undefined,
  liveAmountCents?: number | null,
): CustomerPaymentResponse | null {
  if (!payment && (liveAmountCents == null || liveAmountCents <= 0)) return null;
  const amountCents =
    liveAmountCents != null && liveAmountCents > 0
      ? liveAmountCents
      : payment?.amountCents ?? 0;
  return {
    paymentId: payment?.id ?? "pending",
    amount: customerUsdMajor(amountCents),
    amountCents,
    currency: CUSTOMER_CURRENCY,
    amountLabel: formatCustomerUsd(amountCents),
    status: payment?.status ?? "PENDING",
  };
}

export function toCustomerCheckoutResponse(opts: {
  payment: PaymentLike;
  productName?: string;
  authorizationUrl?: string | null;
  alreadyCleared?: boolean;
}): CustomerCheckoutResponse {
  return {
    ...toCustomerPayment(opts.payment)!,
    productName: opts.productName,
    authorizationUrl: opts.authorizationUrl ?? null,
    alreadyCleared: opts.alreadyCleared,
  };
}

export function toAdminPayment(
  payment: PaymentLike | null | undefined,
): AdminPaymentResponse | null {
  const customer = toCustomerPayment(payment);
  if (!customer || !payment) return null;
  const internalAmount = payment.internalAmount ?? null;
  return {
    ...customer,
    internalAmount,
    internalCurrency: payment.internalCurrency ?? null,
    internalAmountLabel:
      internalAmount != null && internalAmount > 0
        ? formatInternalGhs(internalAmount)
        : null,
    exchangeRate: payment.exchangeRate ?? null,
    paystackReference: payment.paystackReference ?? null,
    paidAt: payment.paidAt ?? null,
    waivedAt: payment.waivedAt ?? null,
  };
}

export function withCustomerPayment<
  T extends {
    payment?: PaymentLike | null;
    apcPaymentStatus?: string | null;
    journal?: JournalApcLike | null;
  },
>(
  record: T,
): Omit<T, "payment"> & { payment: CustomerPaymentResponse | null } {
  const { payment, ...rest } = record;
  const live = livePendingApcCents(
    record.journal,
    payment,
    record.apcPaymentStatus,
  );
  return {
    ...(rest as Omit<T, "payment">),
    payment: toCustomerPayment(payment, live),
  };
}

export function withAdminPayment<
  T extends {
    payment?: PaymentLike | null;
    apcPaymentStatus?: string | null;
    journal?: JournalApcLike | null;
  },
>(
  record: T,
): Omit<T, "payment"> & { payment: AdminPaymentResponse | null } {
  const { payment, ...rest } = record;
  const live = livePendingApcCents(
    record.journal,
    payment,
    record.apcPaymentStatus,
  );
  const customer = toCustomerPayment(payment, live);
  const admin = toAdminPayment(
    payment
      ? {
          ...payment,
          amountCents: live ?? payment.amountCents,
        }
      : payment,
  );
  return {
    ...(rest as Omit<T, "payment">),
    payment: admin ?? (customer ? { ...customer, internalAmount: null, internalCurrency: null, internalAmountLabel: null, exchangeRate: null, paystackReference: null, paidAt: null, waivedAt: null } : null),
  };
}
