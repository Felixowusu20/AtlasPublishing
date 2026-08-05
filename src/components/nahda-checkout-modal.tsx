"use client";

import { useEffect, useId, useRef, useState } from "react";

type Step = "card" | "pin" | "otp" | "birthday" | "phone" | "3ds" | "success";

type Props = {
  open: boolean;
  onClose: () => void;
  submissionId: string;
  manuscriptId: string;
  amountLabel: string;
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
  onPaid,
}: Props) {
  const titleId = useId();
  const [step, setStep] = useState<Step>("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("card");
      setBusy(false);
      setError("");
      setHint("");
      setReference(null);
      setAuthUrl(null);
      setCardNumber("");
      setExpiry("");
      setCvv("");
      setPin("");
      setOtp("");
      setBirthday("");
      setPhone("");
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function applyChargeResult(data: {
    paid?: boolean;
    status?: string;
    message?: string | null;
    reference?: string;
    authUrl?: string | null;
  }) {
    if (data.reference) setReference(data.reference);
    if (data.paid || data.status === "success") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setStep("success");
      setHint("");
      onPaid();
      return;
    }

    const status = (data.status || "").toLowerCase();
    setHint(data.message || "");

    if (status === "send_pin") {
      setStep("pin");
      return;
    }
    if (status === "send_otp") {
      setStep("otp");
      return;
    }
    if (status === "send_birthday") {
      setStep("birthday");
      return;
    }
    if (status === "send_phone") {
      setStep("phone");
      return;
    }
    if (status === "open_url" && data.authUrl) {
      setAuthUrl(data.authUrl);
      setStep("3ds");
      // Poll until bank auth completes
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        void continueCharge("check");
      }, 3000);
      return;
    }
    if (status === "pending" || status === "ongoing") {
      setHint(data.message || "Confirming payment…");
      return;
    }
    if (status === "failed" || status === "abandoned" || status === "reversed") {
      setError(data.message || "Payment failed. Please try again.");
      setStep("card");
      return;
    }

    setError(data.message || "Could not complete payment. Please try again.");
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
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function continueCharge(
    action: "pin" | "otp" | "birthday" | "phone" | "check",
  ) {
    if (!reference) {
      setError("Missing payment reference. Start again.");
      setStep("card");
      return;
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
          reference,
          pin: action === "pin" ? pin : undefined,
          otp: action === "otp" ? otp : undefined,
          birthday: action === "birthday" ? birthday : undefined,
          phone: action === "phone" ? phone : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not continue payment");
      applyChargeResult(data);
    } catch (err) {
      if (action !== "check") {
        setError(err instanceof Error ? err.message : "Could not continue payment");
      }
    } finally {
      if (action !== "check") setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-[var(--ink)]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close checkout"
        onClick={() => {
          if (!busy && step !== "success") onClose();
        }}
      />

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
            {step !== "success" && (
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
              Amount due (USD)
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              {amountLabel}
            </p>
            <p className="mt-1 truncate text-xs text-emerald-50/85">
              Manuscript {manuscriptId}
            </p>
          </div>
        </header>

        <div className="overflow-y-auto px-5 py-5">
          {step === "success" ? (
            <div className="py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-[var(--accent)]">
                ✓
              </div>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Payment received
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Your manuscript is now in production. An official Nahda
                Publications receipt in USD has been sent to your email.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary mt-6 w-full !py-3"
              >
                Done
              </button>
            </div>
          ) : step === "3ds" && authUrl ? (
            <div>
              <p className="text-sm text-[var(--muted)]">
                Complete bank authentication below. This window will update when
                payment succeeds.
              </p>
              <iframe
                title="Bank authentication"
                src={authUrl}
                className="mt-4 h-72 w-full rounded-xl border border-[var(--surface)] bg-white"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void continueCharge("check")}
                className="btn-secondary mt-4 w-full !py-2.5 text-sm"
              >
                I’ve completed authentication
              </button>
            </div>
          ) : step === "pin" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void continueCharge("pin");
              }}
              className="space-y-4"
            >
              <p className="text-sm text-[var(--muted)]">
                {hint || "Enter your card PIN to authorize this payment."}
              </p>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[var(--ink)]">
                  Card PIN
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 4))}
                  className="w-full rounded-xl border border-[var(--surface)] bg-[var(--paper)] px-4 py-3 text-center text-lg tracking-[0.4em]"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy || pin.length < 4}
                className="btn-primary w-full !py-3 disabled:opacity-60"
              >
                {busy ? "Authorizing…" : `Confirm ${amountLabel}`}
              </button>
            </form>
          ) : step === "otp" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void continueCharge("otp");
              }}
              className="space-y-4"
            >
              <p className="text-sm text-[var(--muted)]">
                {hint || "Enter the OTP sent to your phone or email."}
              </p>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[var(--ink)]">
                  One-time password
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(onlyDigits(e.target.value).slice(0, 10))}
                  className="w-full rounded-xl border border-[var(--surface)] bg-[var(--paper)] px-4 py-3 text-center text-lg tracking-widest"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy || otp.length < 4}
                className="btn-primary w-full !py-3 disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Submit OTP"}
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
              <p className="text-sm text-[var(--muted)]">
                Pay your article processing charge with Visa, Mastercard, or
                Verve. You will receive a Nahda receipt in USD after payment.
              </p>

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
                {busy ? "Processing…" : `Pay ${amountLabel} USD`}
              </button>

              <p className="text-center text-[11px] text-[var(--muted)]">
                Card details are sent securely to Paystack and are never stored
                by Nahda Publications.
              </p>
            </form>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
