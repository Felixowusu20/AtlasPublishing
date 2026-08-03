"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Slide = {
  src: string;
  alt: string;
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

export function HeroSlider() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void fetch("/api/cms/hero")
      .then((r) => r.json())
      .then((data) => {
        const next: Slide[] = (data.slides ?? []).map(
          (s: {
            imageUrl: string;
            alt?: string | null;
            title: string;
            body: string;
            ctaLabel?: string | null;
            ctaHref?: string | null;
          }) => ({
            src: s.imageUrl,
            alt: s.alt || s.title,
            title: s.title,
            body: s.body,
            ctaLabel: s.ctaLabel,
            ctaHref: s.ctaHref,
          }),
        );
        setSlides(next);
        setIndex(0);
      })
      .catch(() => setSlides([]))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  if (!ready) {
    return (
      <section className="relative isolate min-h-[38vh] border-b border-[var(--line)] bg-[var(--ink)] sm:min-h-[50vh]" />
    );
  }

  if (slides.length === 0) {
    return (
      <section className="relative isolate border-b border-[var(--line)] bg-[var(--ink)] text-white">
        <div className="relative z-10 mx-auto flex min-h-[38vh] max-w-6xl flex-col justify-end px-4 py-8 sm:min-h-[50vh] sm:px-6 sm:py-20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200 sm:text-xs">
            Nahda Publications
          </p>
          <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-2xl leading-tight sm:mt-4 sm:text-5xl">
            Hero content coming soon
          </h1>
          <p className="mt-3 max-w-xl text-sm text-slate-200 sm:mt-4 sm:text-lg">
            Add slides in Admin → Hero CMS to publish the homepage hero.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
            <Link
              href="/journals"
              className="inline-flex rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white sm:px-5 sm:py-3"
            >
              Browse journals
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const current = slides[index] ?? slides[0];

  return (
    <section className="relative isolate max-w-[100%] overflow-x-clip border-b border-[var(--line)] bg-[var(--ink)] text-white">
      {/* Absolute slides (not a wide flex track) so mobile Safari can't expand page width */}
      <div className="absolute inset-0 overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={`${slide.src}-${i}`}
            className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ease-in-out ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              unoptimized={slide.src.startsWith("http")}
              className={`object-cover object-[center_30%] sm:object-center ${
                i === index ? "hero-kenburns" : ""
              }`}
            />
          </div>
        ))}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(105deg, rgba(11,31,51,0.88) 0%, rgba(11,31,51,0.72) 45%, rgba(15,107,106,0.55) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[42vh] max-w-6xl flex-col justify-end px-4 py-8 sm:min-h-[70vh] sm:px-6 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200 sm:text-xs">
          Nahda Publications
        </p>
        <h1 className="mt-2 max-w-2xl font-[family-name:var(--font-display)] text-2xl leading-tight sm:mt-4 sm:text-5xl">
          {current.title}
        </h1>
        <p className="mt-2 line-clamp-3 max-w-xl text-sm text-slate-200 sm:mt-4 sm:line-clamp-none sm:text-lg">
          {current.body}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
          <Link
            href={current.ctaHref || "/submissions/new"}
            className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] sm:px-5 sm:py-3"
          >
            {current.ctaLabel || "Submit a manuscript"}
          </Link>
          <Link
            href="/journals"
            className="inline-flex rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white sm:px-5 sm:py-3"
          >
            Browse journals
          </Link>
        </div>
        {slides.length > 1 && (
          <div className="mt-5 flex gap-2 sm:mt-8">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition ${
                  i === index ? "w-8 bg-white" : "w-3 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
