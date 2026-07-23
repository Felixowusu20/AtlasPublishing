"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { platformStats } from "@/data/mock";

type Slide = {
  src: string;
  alt: string;
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

const fallbackSlides: Slide[] = [
  {
    src: "/hero/slide-1.jpg",
    alt: "Research landscape",
    title: "Advance research from submission to citation",
    body: "Atlas helps researchers submit manuscripts, track peer review, and publish across our journals, from first draft to lasting citation.",
    ctaLabel: "Submit a manuscript",
    ctaHref: "/submissions/new",
  },
  {
    src: "/hero/slide-2.jpg",
    alt: "Academic library",
    title: "Publish with clarity, rigor, and reach",
    body: "Choose a journal that fits your field, follow a guided submission path, and move from review to publication with confidence.",
  },
  {
    src: "/hero/slide-3.jpg",
    alt: "Scholarly workspace",
    title: "Stay close to every stage of peer review",
    body: "Track editorial decisions, respond to revision requests, and keep your manuscripts moving without losing momentum.",
  },
];

export function HeroSlider() {
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    void fetch("/api/cms/hero")
      .then((r) => r.json())
      .then((data) => {
        if (data.slides?.length) {
          setSlides(
            data.slides.map(
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
            ),
          );
        }
      })
      .catch(() => {
        // keep fallback
      });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [slides.length]);

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
        <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-300">
          {(
            [
              [String(platformStats.journals), "Journals"],
              [String(platformStats.articlesPublished), "Articles"],
              [String(platformStats.authors), "Authors"],
            ] as const
          ).map(([value, label]) => (
            <div key={label}>
              <p className="text-xl font-semibold text-white">{value}</p>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                {label}
              </p>
            </div>
          ))}
        </div>
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
      </div>
    </section>
  );
}
