"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AOS from "aos";
import { useAosReady } from "@/components/aos-provider";

export type ResearchSpotlightCard = {
  id: string;
  title: string;
  summary?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  articleTitle?: string | null;
  href?: string | null;
  ctaLabel?: string | null;
};

function Card({
  item,
  aosDelay,
}: {
  item: ResearchSpotlightCard;
  aosDelay: number;
}) {
  const inner = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--surface)]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.articleTitle || item.title}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 80vw, 280px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--surface)] to-[var(--line)] px-6 text-center text-sm text-[var(--muted)]">
            {item.title}
          </div>
        )}
        {item.logoUrl ? (
          <div className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/70 bg-white/95 p-1.5 shadow-sm backdrop-blur">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.logoUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Research area
        </p>
        <h3 className="font-[family-name:var(--font-display)] text-lg leading-snug text-[var(--ink)]">
          {item.title}
        </h3>
        {item.summary ? (
          <p className="line-clamp-2 text-sm text-[var(--muted)]">
            {item.summary}
          </p>
        ) : null}
        {item.articleTitle ? (
          <p className="mt-auto line-clamp-2 text-xs font-medium text-[var(--ink)]/80">
            {item.articleTitle}
          </p>
        ) : (
          <span className="mt-auto" />
        )}
        {item.href && item.ctaLabel ? (
          <span className="text-xs font-semibold text-[var(--accent)]">
            {item.ctaLabel} →
          </span>
        ) : null}
      </div>
    </>
  );

  const className =
    "research-spotlight-card group flex w-[min(82vw,280px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_10px_30px_-18px_rgba(11,58,83,0.35)] sm:w-[min(78vw,280px)]";

  const aosProps = {
    "data-aos": "fade-up",
    "data-aos-delay": String(aosDelay),
    "data-aos-duration": "750",
  } as const;

  if (item.href) {
    return (
      <Link href={item.href} className={className} {...aosProps}>
        {inner}
      </Link>
    );
  }

  return (
    <article className={className} {...aosProps}>
      {inner}
    </article>
  );
}

export function ResearchSpotlights({
  initialItems = [],
}: {
  initialItems?: ResearchSpotlightCard[];
}) {
  const [items, setItems] = useState<ResearchSpotlightCard[]>(initialItems);
  const aosReady = useAosReady();

  useEffect(() => {
    if (initialItems.length > 0) return;
    void fetch("/api/cms/research-spotlights")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.spotlights ?? []);
      })
      .catch(() => {
        setItems([]);
      });
  }, [initialItems.length]);

  useEffect(() => {
    if (!aosReady || items.length === 0) return;
    const id = window.setTimeout(() => AOS.refresh(), 80);
    return () => window.clearTimeout(id);
  }, [items.length, aosReady]);

  if (items.length === 0) return null;

  // Show unique cards (not the marquee duplicate loop) for AOS visibility;
  // keep marquee track for continuous motion.
  const loop =
    items.length === 1 ? [...items, ...items, ...items] : [...items, ...items];

  return (
    <section
      className="research-spotlights border-b border-[var(--line)] bg-white"
      aria-label="Scientific research areas"
      data-aos="fade-up"
      data-aos-duration="700"
    >
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-16">
        <div
          className="flex flex-wrap items-end justify-between gap-3"
          data-aos="fade-up"
          data-aos-delay="60"
        >
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Featured research
            </p>
            <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl leading-tight tracking-tight text-[var(--ink)] sm:mt-2 sm:text-4xl">
              Scientific research areas
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] sm:mt-3 sm:text-base">
              Explore partner research themes and the papers we have published
              in those areas.
            </p>
          </div>
        </div>
      </div>

      <div className="research-spotlights-track mt-6 pb-8 sm:mt-8 sm:pb-12">
        <div className="research-spotlights-marquee">
          {loop.map((item, index) => (
            <Card
              key={`${item.id}-${index}`}
              item={item}
              aosDelay={Math.min((index % items.length) * 90, 360)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
