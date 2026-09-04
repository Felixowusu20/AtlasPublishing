"use client";

import { useEffect, useRef } from "react";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

type Props = {
  id: string;
  label?: string;
  hint?: string;
  length: number;
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  mask?: boolean;
  className?: string;
};

export function BankCodeFields({
  id,
  label,
  hint,
  length,
  value,
  onChange,
  disabled,
  autoComplete = "one-time-code",
  mask = false,
  className,
}: Props) {
  const boxes = Array.from({ length }, (_, i) => value[i] ?? "");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!value) refs.current[0]?.focus();
  }, [value]);

  function setAt(index: number, raw: string) {
    const incoming = onlyDigits(raw);
    if (!incoming) {
      const next = boxes.map((d, i) => (i === index ? "" : d)).join("");
      onChange(next);
      return;
    }
    if (incoming.length > 1) {
      const pasted = incoming.slice(0, length);
      onChange(pasted);
      const focusAt = Math.min(pasted.length, length - 1);
      refs.current[focusAt]?.focus();
      return;
    }
    const next = boxes.map((d, i) => (i === index ? incoming : d)).join("");
    onChange(next.slice(0, length));
    if (index < length - 1) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, key: string) {
    if (key === "Backspace" && !boxes[index] && index > 0) {
      const next = boxes.map((d, i) => (i === index - 1 ? "" : d)).join("");
      onChange(next);
      refs.current[index - 1]?.focus();
    }
    if (key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  const accessibleLabel = label || "OTP";

  return (
    <fieldset className={className || "block"} disabled={disabled}>
      {label ? (
        <legend className="mb-1.5 text-sm font-medium text-[var(--ink)]">
          {label}
        </legend>
      ) : (
        <legend className="sr-only">{accessibleLabel}</legend>
      )}
      {hint ? (
        <p className="mb-3 text-sm text-[var(--muted)]">{hint}</p>
      ) : null}
      <div className="flex justify-center gap-2">
        {boxes.map((digit, index) => (
          <input
            key={`${id}-${index}`}
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={index === 0 ? id : undefined}
            type={mask ? "password" : "text"}
            inputMode="numeric"
            autoComplete={index === 0 ? autoComplete : "off"}
            aria-label={`${accessibleLabel} digit ${index + 1}`}
            maxLength={length}
            value={digit}
            disabled={disabled}
            onChange={(e) => setAt(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e.key)}
            className="h-12 w-10 rounded-xl border-2 border-stone-300 bg-white text-center text-lg font-semibold tracking-widest text-[var(--ink)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:opacity-60 sm:h-14 sm:w-11"
          />
        ))}
      </div>
    </fieldset>
  );
}
