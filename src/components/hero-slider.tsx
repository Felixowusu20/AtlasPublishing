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
      <section className="relative isolate min-h-[50vh] border-b border-[var(--line)] bg-[var(--ink)]" />
    );
  }

  if (slides.length === 0) {
    return (
      <section className="relative isolate border-b border-[var(--line)] bg-[var(--ink)] text-white">
        <div className="relative z-10 mx-auto flex min-h-[50vh] max-w-6xl flex-col justify-end px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
            Atlas Academic Publishing
          </p>
          <h1 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
            Hero content coming soon
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-200 sm:text-lg">
            Add slides in Admin → Hero CMS to publish the homepage hero.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/journals"
              className="inline-flex rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white"
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
    <section className="relative isolate overflow-hidden border-b border-[var(--line)] bg-[var(--ink)] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-700 ease-in-out will-change-transform"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(-${(index * 100) / slides.length}%)`,
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={`${slide.src}-${i}`}
              className="relative h-full"
              style={{ width: `${100 / slides.length}%` }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                unoptimized={slide.src.startsWith("http")}
                className={`object-cover object-center ${i === index ? "hero-kenburns" : ""}`}
              />
            </div>
          ))}
        </div>
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(105deg, rgba(11,31,51,0.88) 0%, rgba(11,31,51,0.72) 45%, rgba(15,107,106,0.55) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-end px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
          Atlas Academic Publishing
        </p>
        <h1 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
          {current.title}
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-200 sm:text-lg">
          {current.body}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={current.ctaHref || "/submissions/new"}
            className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)]"
          >
            {current.ctaLabel || "Submit a manuscript"}
          </Link>
          <Link
            href="/journals"
            className="inline-flex rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white"
          >
            Browse journals
          </Link>
        </div>
        {slides.length > 1 && (
          <div className="mt-8 flex gap-2">
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
