import type { ProseBlock } from "@/lib/cms";

export function CmsProse({ blocks }: { blocks: ProseBlock[] }) {
  return (
    <div className="space-y-4 text-base leading-relaxed text-[var(--ink)]">
      {blocks.map((block, i) => {
        if (block.type === "h") {
          return (
            <h2
              key={i}
              className="pt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "ul") {
          return (
            <ul
              key={i}
              className="list-disc space-y-2 pl-5 text-[var(--muted)]"
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[var(--muted)]">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
