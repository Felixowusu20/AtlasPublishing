"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  {
    src: "/hero/slide-1.jpg",
    alt: "Research landscape",
  },
  {
    src: "/hero/slide-2.jpg",
    alt: "Academic library",
  },
  {
    src: "/hero/slide-3.jpg",
    alt: "Scholarly workspace",
  },
  {
    src: "/hero/slide-4.jpg",
    alt: "Campus and learning",
  },
];

export function HeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out will-change-[opacity]"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
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

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(11,31,51,0.88) 0%, rgba(11,31,51,0.72) 45%, rgba(15,107,106,0.55) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 15% 20%, rgba(26,107,106,0.55) 0%, transparent 45%), radial-gradient(ellipse at 85% 10%, rgba(30,74,110,0.45) 0%, transparent 40%)",
        }}
      />

      <div className="pointer-events-auto absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
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
    </div>
  );
}
