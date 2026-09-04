"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BankCodeFields } from "@/components/bank-code-fields";
import {
  cardholderChargeMessage,
  OTP_ACCOUNT_PROMPT,
  OTP_SESSION_DURATION_MS,
  OTP_SESSION_SECONDS,
  formatOtpCountdown,
  otpSessionExpiredMessage,
  otpVerificationError,
} from "@/lib/payment-display";

type Step =
  | "card"
  | "pin"
  | "otp"
  | "birthday"
  | "phone"
  | "confirming"
  | "success";

type Props = {
  open: boolean;
  onClose: () => void;
  submissionId: string;
  manuscriptId: string;
  amountLabel: string;
  payToken?: string | null;
  closable?: boolean;
  onPaid: () => void;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  const digits = onlyDigits(value).slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function NahdaCheckoutModal({
  open,
  onClose,
  submissionId,
  manuscriptId,
  amountLabel,
  payToken,
  closable = true,
  onPaid,
}: Props) {
  const titleId = useId();
  const [step, setStep] = useState<Step>("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const referenceRef = useRef<string | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paidReference, setPaidReference] = useState("");
  const [receiptEmail, setReceiptEmail] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(OTP_SESSION_SECONDS);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  const paidNotifiedRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otpSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActionRef = useRef<string>("charge");
  const stepRef = useRef<Step>("card");
  stepRef.current = step;

  useEffect(() => {
    if (!open) {
      setStep("card");
      setBusy(false);
      setError("");
      setHint("");
      referenceRef.current = null;
      setAuthUrl(null);
      setCardNumber("");
      setExpiry("");
      setCvv("");
      setPin("");
      setOtp("");
      setBirthday("");
      setPhone("");
      setReceiptNumber("");
      setPaidReference("");
      setReceiptEmail("");
      setOtpExpiresAt(null);
      setOtpSecondsLeft(OTP_SESSION_SECONDS);
      submittingRef.current = false;
      paidNotifiedRef.current = false;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
      if (otpSubmitTimerRef.current) {
        clearTimeout(otpSubmitTimerRef.current);
        otpSubmitTimerRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      if (otpSubmitTimerRef.current) clearTimeout(otpSubmitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== "otp" || !otpExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      setOtpSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, otpExpiresAt]);

  useEffect(() => {
    if (!open || step !== "otp" || otpExpiresAt) return;
    beginOtpSession();
  }, [open, step, otpExpiresAt]);

  function beginOtpSession() {
    const expiresAt = Date.now() + OTP_SESSION_DURATION_MS;
    setOtpExpiresAt(expiresAt);
    setOtpSecondsLeft(OTP_SESSION_SECONDS);
    return expiresAt;
  }

  function resetCheckoutAfterOtpExpiry() {
    stopWatching();
    submittingRef.current = false;
    setBusy(false);
    setError("");
    setHint("");
    setOtp("");
    setPin("");
    setOtpExpiresAt(null);
    setOtpSecondsLeft(OTP_SESSION_SECONDS);
    referenceRef.current = null;
    setAuthUrl(null);
    setStep("card");
  }

  function rememberReference(value: string | null | undefined) {
    if (!value) return;
    referenceRef.current = value;
  }

  function stopWatching() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function watchForPayment(reference?: string | null) {
    const ref = reference || referenceRef.current;
    if (!ref) return;
    stopWatching();
    pollRef.current = setInterval(() => {
      void continueCharge("check", ref);
    }, 1200);
  }

  function notifyPaid() {
    if (paidNotifiedRef.current) return;
    paidNotifiedRef.current = true;
    onPaid();
  }

  function showConfirmation(data: {
    reference?: string;
    receiptNumber?: string;
    emailSentTo?: string;
  }) {
    stopWatching();
    submittingRef.current = false;
    setBusy(false);
    setError("");
    setHint("");
    if (data.reference) setPaidReference(data.reference);
    if (data.receiptNumber) setReceiptNumber(data.receiptNumber);
    if (data.emailSentTo) setReceiptEmail(data.emailSentTo);
    setStep("success");
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => {
      notifyPaid();
    }, 8000);
  }

  function applyChargeResult(data: {
    paid?: boolean;
    status?: string;
    message?: string | null;
    bankHint?: string | null;
    reference?: string;
    authUrl?: string | null;
    receiptNumber?: string;
    emailSentTo?: string;
  }) {
    rememberReference(data.reference);
    if (data.paid || data.status === "success") {
      showConfirmation(data);
      return;
    }

    const status = (data.status || "").toLowerCase();
    const bankHint =
      data.bankHint ||
      cardholderChargeMessage({
        message: data.message,
        status,
        amountLabel,
      });

    if (status === "send_pin") {
      setError("");
      setHint(bankHint || "Enter the PIN for this card. Your bank will then send an OTP.");
      setStep("pin");
      return;
    }
    if (status === "send_otp" || status === "open_url") {
      setBusy(false);
      if (data.authUrl) setAuthUrl(data.authUrl);
      if (lastActionRef.current === "otp") {
        const actual = otpVerificationError(data.message);
        const isPrompt =
          !actual || actual === OTP_ACCOUNT_PROMPT;
        setError(isPrompt ? "" : actual);
        setOtp("");
      } else {
        setError("");
        beginOtpSession();
      }
      setHint(OTP_ACCOUNT_PROMPT);
      setStep("otp");
      return;
    }
    if (status === "send_birthday") {
      setError("");
      setHint(bankHint || "Enter your date of birth to continue.");
      setStep("birthday");
      return;
    }
    if (status === "send_phone") {
      setError("");
      setHint(bankHint || "Enter the phone number on this card.");
      setStep("phone");
      return;
    }
    if (status === "pending" || status === "ongoing") {
      if (stepRef.current === "otp") {
        setHint("Verifying your bank code and charging…");
        setStep("otp");
        watchForPayment(data.reference || referenceRef.current);
        return;
      }
      if (!otpExpiresAt) beginOtpSession();
      setHint("Waiting for your bank to send a verification code…");
      setStep("otp");
      return;
    }
    if (status === "failed" || status === "reversed" || status === "abandoned") {
      stopWatching();
      setBusy(false);
      if (stepRef.current === "otp" || lastActionRef.current === "otp") {
        const actual = otpVerificationError(data.message);
        const isPrompt = !actual || actual === OTP_ACCOUNT_PROMPT;
        setError(isPrompt ? "" : actual);
        setHint(OTP_ACCOUNT_PROMPT);
        setOtp("");
        setStep("otp");
        return;
      }
      setHint("");
      setError(
        cardholderChargeMessage({
          message: data.message,
          status,
          amountLabel,
        }) || "Payment failed. Please try again.",
      );
      setStep("card");
      return;
    }

    setError(
      cardholderChargeMessage({
        message: data.message,
        status,
        amountLabel,
      }) || "Could not complete payment. Please try again.",
    );
  }

  async function startCharge(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setHint("");

    const [month, year] = expiry.split("/");
    if (!month || !year) {
      setError("Enter a valid expiry (MM/YY)");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/payments/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "charge",
          submissionId,
          ...(payToken ? { token: payToken } : {}),
          card: {
            number: onlyDigits(cardNumber),
            cvv: onlyDigits(cvv),
            expiryMonth: month,
            expiryYear: year,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed");
      applyChargeResult(data);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Payment failed";
      setError(cardholderChargeMessage({ message: raw, amountLabel }) || raw);
    } finally {
      setBusy(false);
    }
  }

  async function continueCharge(
    action: "pin" | "otp" | "birthday" | "phone" | "check",
    referenceOverride?: string | null,
    valueOverride?: string | null,
  ) {
    const ref = referenceOverride || referenceRef.current;
    if (!ref) {
      setError("Missing payment reference. Start again.");
      setStep("card");
      return;
    }
    lastActionRef.current = action;
    if (action === "otp" || action === "pin") {
      if (submittingRef.current) return;
      submittingRef.current = true;
    }
    if (action !== "check") {
      setBusy(true);
      setError("");
    }

    try {
      const res = await fetch("/api/payments/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          submissionId,
          ...(payToken ? { token: payToken } : {}),
          reference: ref,
          pin: action === "pin" ? valueOverride ?? pin : undefined,
          otp: action === "otp" ? valueOverride ?? otp : undefined,
          birthday: action === "birthday" ? birthday : undefined,
          phone: action === "phone" ? phone : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not continue payment");
      applyChargeResult(data);
      if (
        action === "otp" &&
        !data.paid &&
        data.status !== "success" &&
        data.status !== "failed" &&
        data.status !== "send_otp"
      ) {
        setHint("Verifying your bank code and charging…");
        setStep("otp");
        watchForPayment(data.reference || ref);
      }
    } catch (err) {
      if (action === "check") return;
      const raw =
        err instanceof Error ? err.message : "Could not continue payment";
      if (action === "otp") {
        const actual = otpVerificationError(raw);
        const isPrompt = !actual || actual === OTP_ACCOUNT_PROMPT;
        setError(isPrompt ? "" : actual);
        setHint(OTP_ACCOUNT_PROMPT);
        setOtp("");
        setStep("otp");
        return;
      }
      setError(cardholderChargeMessage({ message: raw, amountLabel }) || raw);
    } finally {
      if (action === "otp" || action === "pin") {
        submittingRef.current = false;
      }
      if (action !== "check") setBusy(false);
    }
  }

  function onBankOtpChange(digits: string) {
    setOtp(digits);
    setError("");
    if (otpSubmitTimerRef.current) {
      clearTimeout(otpSubmitTimerRef.current);
      otpSubmitTimerRef.current = null;
    }
    if (otpSecondsLeft <= 0) return;
    if (submittingRef.current) return;
    if (digits.length >= 6) {
      otpSubmitTimerRef.current = setTimeout(() => {
        void continueCharge("otp", null, digits);
      }, 80);
    } else if (digits.length >= 4) {
      otpSubmitTimerRef.current = setTimeout(() => {
        void continueCharge("otp", null, digits);
      }, 1000);
    }
  }

  const otpSessionExpired =
    step === "otp" && otpSecondsLeft <= 0 && otpExpiresAt !== null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-[var(--ink)]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {closable ? (
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Close checkout"
          onClick={() => {
            if (!busy && step !== "success") onClose();
          }}
        />
      ) : null}

      <div className="relative z-10 flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="border-b border-[var(--surface)] bg-gradient-to-br from-[var(--accent)] to-[#164f36] px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-nahda-on-dark.png"
                alt=""
                className="h-10 w-auto object-contain"
              />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/90">
                  Nahda Publications
                </p>
                <h2
                  id={titleId}
                  className="font-[family-name:var(--font-display)] text-lg font-semibold leading-tight"
                >
                  Secure APC payment
                </h2>
              </div>
            </div>
            {closable && step !== "success" && (
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-full bg-white/10 px-2.5 py-1 text-sm text-white hover:bg-white/20 disabled:opacity-50"
              >
                ✕
              </button>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100/80">
              {step === "success" ? "Amount paid" : "Amount due"}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              {amountLabel}
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-emerald-50/90">
              <dt className="text-emerald-100/70">Currency</dt>
              <dd className="font-semibold">USD</dd>
              <dt className="text-emerald-100/70">Merchant</dt>
              <dd className="font-semibold">Nahda Publications</dd>
            </dl>
            <p className="mt-2 truncate text-xs text-emerald-50/85">
              Manuscript {manuscriptId}
            </p>
          </div>
        </header>

        <div className="overflow-y-auto px-5 py-5">
          {error && step !== "success" && (
            <p className="mb-4 whitespace-pre-line rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          {step === "success" ? (
            <div className="py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-[var(--accent)]">
                ✓
              </div>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Payment received
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {amountLabel} has been charged. A Nahda Publications receipt in
                USD has been emailed
                {receiptEmail ? ` to ${receiptEmail}` : " to you"}.
              </p>
              <dl className="mx-auto mt-4 max-w-xs text-left text-sm">
                <div className="flex justify-between gap-3 border-b border-[var(--surface)] py-2">
                  <dt className="text-[var(--muted)]">Amount paid</dt>
                  <dd className="font-semibold text-[var(--ink)]">
                    {amountLabel}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[var(--surface)] py-2">
                  <dt className="text-[var(--muted)]">Currency</dt>
                  <dd className="font-semibold text-[var(--ink)]">USD</dd>
                </div>
                {receiptNumber ? (
                  <div className="flex justify-between gap-3 border-b border-[var(--surface)] py-2">
                    <dt className="text-[var(--muted)]">Receipt</dt>
                    <dd className="font-mono text-xs font-semibold text-[var(--ink)]">
                      {receiptNumber}
                    </dd>
                  </div>
                ) : null}
                {paidReference ? (
                  <div className="flex justify-between gap-3 border-b border-[var(--surface)] py-2">
                    <dt className="text-[var(--muted)]">Confirmation</dt>
                    <dd className="break-all font-mono text-xs font-semibold text-[var(--ink)]">
                      {paidReference}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-[var(--muted)]">Merchant</dt>
                  <dd className="font-semibold text-[var(--ink)]">
                    Nahda Publications
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => {
                  if (redirectTimerRef.current) {
                    clearTimeout(redirectTimerRef.current);
                    redirectTimerRef.current = null;
                  }
                  notifyPaid();
                  if (closable) onClose();
                }}
                className="btn-primary mt-6 w-full !py-3"
              >
                Done
              </button>
            </div>
          ) : step === "confirming" ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Completing payment
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {hint || "Checking your bank verification…"}
              </p>
            </div>
          ) : step === "otp" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (otpSessionExpired) return;
                if (otp.length >= 4) void continueCharge("otp");
              }}
              className="relative space-y-4"
            >
              <p className="text-center text-sm text-[var(--ink)]">
                {OTP_ACCOUNT_PROMPT}
              </p>
              <div className="flex items-center justify-center gap-3">
                <BankCodeFields
                  id="bank-otp"
                  className="w-fit"
                  length={6}
                  value={otp}
                  onChange={onBankOtpChange}
                  disabled={busy || otpSessionExpired}
                />
                <p
                  className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
                    otpSessionExpired
                      ? "text-rose-700"
                      : "text-[var(--accent)]"
                  }`}
                  aria-live="polite"
                  aria-label={
                    otpSessionExpired
                      ? "OTP expired"
                      : `Time remaining ${formatOtpCountdown(otpSecondsLeft)}`
                  }
                >
                  {formatOtpCountdown(otpSecondsLeft)}
                </p>
              </div>
              {otpSessionExpired ? (
                <>
                  <p className="text-center text-xs text-rose-700">
                    {otpSessionExpiredMessage()}
                  </p>
                  <button
                    type="button"
                    onClick={resetCheckoutAfterOtpExpiry}
                    className="btn-primary w-full !py-3"
                  >
                    Start payment again
                  </button>
                </>
              ) : busy ? (
                <p className="text-center text-sm text-[var(--muted)]">
                  Charging…
                </p>
              ) : null}
              {authUrl ? (
                <iframe
                  title=""
                  src={authUrl}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                />
              ) : null}
            </form>
          ) : step === "pin" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void continueCharge("pin");
              }}
              className="space-y-4"
            >
              <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Enter your card PIN
              </h3>
              <p className="text-sm text-[var(--muted)]">
                {hint ||
                  "Enter the PIN for this card. Your bank will then send an OTP to complete payment."}
              </p>
              <BankCodeFields
                id="bank-pin"
                label="Card PIN"
                length={4}
                value={pin}
                onChange={(digits) => setPin(digits)}
                disabled={busy}
                autoComplete="off"
                mask
              />
              <button
                type="submit"
                disabled={busy || pin.length < 4}
                className="btn-primary w-full !py-3 disabled:opacity-60"
              >
                {busy ? "Authorizing…" : "Continue to bank OTP"}
              </button>
            </form>
          ) : step === "birthday" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void continueCharge("birthday");
              }}
              className="space-y-4"
            >
              <p className="text-sm text-[var(--muted)]">
                {hint || "Enter your date of birth to continue."}
              </p>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[var(--ink)]">
                  Birthday
                </span>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full rounded-xl border border-[var(--surface)] bg-[var(--paper)] px-4 py-3"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy || !birthday}
                className="btn-primary w-full !py-3 disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Continue"}
              </button>
            </form>
          ) : step === "phone" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void continueCharge("phone");
              }}
              className="space-y-4"
            >
              <p className="text-sm text-[var(--muted)]">
                {hint || "Enter the phone number linked to this card."}
              </p>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[var(--ink)]">
                  Phone
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--surface)] bg-[var(--paper)] px-4 py-3"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy || phone.length < 7}
                className="btn-primary w-full !py-3 disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Continue"}
              </button>
            </form>
          ) : (
            <form onSubmit={startCharge} className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[var(--ink)]">
                  Card number
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="ACCT-000035"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="w-full rounded-xl border border-[var(--surface)] bg-[var(--paper)] px-4 py-3 tracking-wider"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-[var(--ink)]">
                    Expiry
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="w-full rounded-xl border border-[var(--surface)] bg-[var(--paper)] px-4 py-3"
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-[var(--ink)]">
                    CVV
                  </span>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) =>
                      setCvv(onlyDigits(e.target.value).slice(0, 4))
                    }
                    className="w-full rounded-xl border border-[var(--surface)] bg-[var(--paper)] px-4 py-3"
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full !py-3.5 text-base disabled:opacity-60"
              >
                {busy ? "Processing…" : `Pay ${amountLabel}`}
              </button>

              <p className="text-center text-[11px] text-[var(--muted)]">
                Card details are sent securely to Paystack and are never stored
                by Nahda Publications.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
