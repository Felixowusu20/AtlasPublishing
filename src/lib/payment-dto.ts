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

export function toCustomerPayment(
  payment: PaymentLike | null | undefined,
): CustomerPaymentResponse | null {
  if (!payment) return null;
  return {
    paymentId: payment.id,
    amount: customerUsdMajor(payment.amountCents),
    amountCents: payment.amountCents,
    currency: CUSTOMER_CURRENCY,
    amountLabel: formatCustomerUsd(payment.amountCents),
    status: payment.status,
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

export function withCustomerPayment<T extends { payment?: PaymentLike | null }>(
  record: T,
): Omit<T, "payment"> & { payment: CustomerPaymentResponse | null } {
  const { payment, ...rest } = record;
  return {
    ...(rest as Omit<T, "payment">),
    payment: toCustomerPayment(payment),
  };
}

export function withAdminPayment<T extends { payment?: PaymentLike | null }>(
  record: T,
): Omit<T, "payment"> & { payment: AdminPaymentResponse | null } {
  const { payment, ...rest } = record;
  return {
    ...(rest as Omit<T, "payment">),
    payment: toAdminPayment(payment),
  };
}
