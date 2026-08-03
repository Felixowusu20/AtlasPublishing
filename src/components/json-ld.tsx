/**
 * Server-rendered JSON-LD. Must stay a Server Component so crawlers see it
 * in the initial HTML (not client-only).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | unknown[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
