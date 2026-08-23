"use client";

import type { KeyboardEvent } from "react";
import type { SearchSuggestion } from "@/lib/page-search";

type Props = {
  id: string;
  items: SearchSuggestion[];
  activeIndex: number;
  onPick: (item: SearchSuggestion) => void;
  onHover: (index: number) => void;
};

export function SearchSuggestionList({
  id,
  items,
  activeIndex,
  onPick,
  onHover,
}: Props) {
  if (items.length === 0) return null;

  return (
    <ul
      id={id}
      role="listbox"
      className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-[var(--line)]"
    >
      {items.map((item, index) => (
        <li key={item.id} role="option" aria-selected={index === activeIndex}>
          <button
            type="button"
            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
              index === activeIndex
                ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                : "text-[var(--ink)] hover:bg-[var(--surface)]"
            }`}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(item);
            }}
            onMouseEnter={() => onHover(index)}
          >
            <span className="min-w-0 truncate font-medium">{item.label}</span>
            <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--muted)]">
              {item.kind === "phrase" ? "On page" : "Word"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function suggestionKeydown(
  event: KeyboardEvent<HTMLInputElement>,
  items: SearchSuggestion[],
  activeIndex: number,
  setActiveIndex: (index: number) => void,
  onPick: (item: SearchSuggestion) => void,
) {
  if (items.length === 0) return false;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActiveIndex((activeIndex + 1) % items.length);
    return true;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    setActiveIndex((activeIndex - 1 + items.length) % items.length);
    return true;
  }
  if (event.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
    event.preventDefault();
    onPick(items[activeIndex]);
    return true;
  }
  if (event.key === "Escape") {
    setActiveIndex(-1);
    return true;
  }
  return false;
}
