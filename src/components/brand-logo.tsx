import Link from "next/link";

type Props = {
  /** Pass null to render without a link wrapper. */
  href?: string | null;
  /** Prefer full lockup. Use onDark on dark surfaces (footer, auth). */
  variant?: "full" | "onDark" | "mark";
  className?: string;
  priority?: boolean;
};

/**
 * Nahda logo (transparent background).
 * Navbar / light surfaces: full green lockup.
 * Footer / dark surfaces: lightened lockup for contrast.
 */
export function BrandLogo({
  href = "/",
  variant = "full",
  className = "",
  priority = false,
}: Props) {
  const src =
    variant === "onDark"
      ? "/brand/logo-nahda-on-dark.png"
      : variant === "mark"
        ? "/favicon.png"
        : "/brand/logo-nahda.png";

  const isMark = variant === "mark";

  const inner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Nahda Publications"
      width={isMark ? 36 : 188}
      height={isMark ? 36 : 55}
      className={
        isMark
          ? `h-9 w-9 rounded-lg object-cover ${className}`
          : `h-9 w-auto max-w-[200px] object-contain object-left sm:h-10 md:max-w-[240px] ${className}`
      }
      // hint cache-bust after transparent re-export
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );

  if (href == null || href === "") return inner;
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center"
      aria-label="Nahda Publications home"
    >
      {inner}
    </Link>
  );
}
