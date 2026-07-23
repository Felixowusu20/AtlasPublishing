"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { platformStats } from "@/data/mock";

const slides = [
  {
    src: "/hero/slide-1.jpg",
    alt: "Research landscape",
    title: "Advance research from submission to citation",
    body: "Atlas helps researchers submit manuscripts, track peer review, and publish across our journals, from first draft to lasting citation.",
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
  {
    src: "/hero/slide-4.jpg",
    alt: "Campus and learning",
    title: "Share discoveries that shape your field",
    body: "From Early View to indexed issues, Atlas helps your work find readers, citations, and lasting scholarly impact.",
  },
];

export function HeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--line)] bg-[var(--ink)] text-white">
      {/* Background track — slides left */}
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
              key={slide.src}
              className="relative h-full"
              style={{ width: `${100 / slides.length}%` }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={i === 0}
                sizes="100vw"
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

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
        <div className="max-w-xl">
          <p className="text-sm font-medium tracking-wide text-teal-200/90">
            Atlas Academic Publishing
          </p>

          {/* Text track — slides left with the images */}
          <div className="relative mt-4 overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-in-out will-change-transform"
              style={{
                width: `${slides.length * 100}%`,
                transform: `translateX(-${(index * 100) / slides.length}%)`,
              }}
            >
              {slides.map((slide) => (
                <div
                  key={slide.title}
                  className="pr-4"
                  style={{ width: `${100 / slides.length}%` }}
                >
                  <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
                    {slide.title}
                  </h1>
                  <p className="mt-5 text-base leading-relaxed text-slate-200">
                    {slide.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons stay the same */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/submissions/new"
              className="inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-100"
            >
              Submit manuscript
            </Link>
            <Link
              href="/articles"
              className="inline-flex rounded-lg border border-white/25 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              Browse articles
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 self-end">
          {[
            [String(platformStats.journals), "Journals"],
            [String(platformStats.articlesPublished), "Articles"],
            [`${platformStats.avgDaysToFirstDecision}d`, "First decision"],
            [String(platformStats.countries), "Countries"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-md"
            >
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Show slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === index
                ? "w-7 bg-white"
                : "w-1.5 bg-white/45 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
