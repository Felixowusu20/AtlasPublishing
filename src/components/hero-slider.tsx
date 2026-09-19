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
      <section className="relative isolate min-h-[48vh] border-b border-[var(--line)] bg-[var(--ink)] sm:min-h-[62vh]" />
    );
  }

  if (slides.length === 0) {
    return (
      <section className="relative isolate overflow-hidden border-b border-[var(--line)] bg-[var(--ink)] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 15% 20%, rgba(30,104,71,0.55), transparent 50%), radial-gradient(ellipse at 85% 80%, rgba(230,242,236,0.12), transparent 45%)",
          }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex min-h-[48vh] max-w-6xl flex-col justify-center px-4 py-14 sm:min-h-[62vh] sm:px-6 sm:py-20">
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-white sm:text-5xl">
            Nahda Publications
          </p>
          <h1 className="mt-4 max-w-3xl text-xl font-medium leading-snug text-white/95 sm:text-3xl sm:leading-tight">
            Empowering researchers and advancing open scholarship worldwide
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-lg">
            Submit manuscripts, follow peer review, and discover trusted
            open-access research across the Nahda journal family.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/submissions/new"
              className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-soft)]"
            >
              Submit a manuscript
            </Link>
            <Link
              href="/journals"
              className="inline-flex rounded-lg border border-white/35 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
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
    <section className="relative isolate max-w-[100%] overflow-x-clip border-b border-[var(--line)] bg-[var(--ink)] text-white home-reveal">
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
              "linear-gradient(105deg, rgba(11,31,51,0.92) 0%, rgba(11,31,51,0.78) 42%, rgba(30,104,71,0.62) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[52vh] max-w-6xl flex-col justify-center px-4 py-12 sm:min-h-[70vh] sm:px-6 sm:py-20">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-white sm:text-4xl">
          Nahda Publications
        </p>
        <h1 className="mt-3 max-w-3xl text-xl font-medium leading-snug text-white sm:mt-5 sm:text-4xl sm:leading-tight">
          {current.title}
        </h1>
        <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:mt-4 sm:line-clamp-none sm:text-lg">
          {current.body}
        </p>
        <div className="mt-7 flex flex-wrap gap-3 sm:mt-9">
          <Link
            href={current.ctaHref || "/submissions/new"}
            className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-soft)]"
          >
            {current.ctaLabel || "Submit a manuscript"}
          </Link>
          <Link
            href="/journals"
            className="inline-flex rounded-lg border border-white/35 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
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
