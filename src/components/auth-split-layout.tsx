import Image from "next/image";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  imageSrc: string;
  imageAlt: string;
  brand: string;
  headline: string;
  subhead?: string;
};

/**
 * Exact viewport split: image | form. No page scroll.
 */
export function AuthSplitLayout({
  children,
  imageSrc,
  imageAlt,
  brand,
  headline,
  subhead,
}: Props) {
  return (
    <div className="fixed inset-0 z-40 flex overflow-hidden bg-[var(--paper)]">
      <aside className="relative hidden h-full w-1/2 shrink-0 overflow-hidden lg:block">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="50vw"
          className="object-cover object-[center_35%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/88 via-[var(--ink)]/35 to-[var(--ink)]/10" />
        <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
            {brand}
          </p>
          <h2 className="mt-2 max-w-md font-[family-name:var(--font-display)] text-2xl leading-snug text-white xl:text-3xl">
            {headline}
          </h2>
          {subhead ? (
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">
              {subhead}
            </p>
          ) : null}
        </div>
      </aside>

      <div className="flex h-full min-h-0 w-full flex-col lg:w-1/2">
        <div className="relative h-24 shrink-0 overflow-hidden sm:h-28 lg:hidden">
          <Image
            src={imageSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[var(--ink)]/60" />
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
              {brand}
            </p>
            <p className="mt-0.5 line-clamp-2 font-[family-name:var(--font-display)] text-base text-white">
              {headline}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-8">
          <div className="auth-compact w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

export const AUTH_IMAGES = {
  /** Warm grand reading room — author login */
  authorLogin:
    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1800&q=85",
  /** Soft desk with notebook — author register */
  authorRegister:
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1800&q=85",
  /** Bright modern workspace — admin login */
  adminLogin:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=85",
  /** Focused editorial desk — admin register */
  adminRegister:
    "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1800&q=85",
} as const;
