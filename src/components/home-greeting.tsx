"use client";

import { useEffect, useState } from "react";

export function HomeGreeting() {
  const [hello, setHello] = useState("Welcome");
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    setHello(
      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening",
    );
    setDateLabel(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
  }, []);

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold leading-tight text-[var(--ink)] sm:text-3xl">
        {hello}
      </h1>
      {dateLabel ? (
        <p className="mt-0.5 text-sm text-[var(--muted)]">{dateLabel}</p>
      ) : (
        <p className="mt-0.5 h-5 text-sm text-[var(--muted)]">&nbsp;</p>
      )}
    </>
  );
}
