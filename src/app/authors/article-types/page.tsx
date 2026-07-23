import { articleTypes } from "@/data/mock";

export default function ArticleTypesPage() {
  return (
    <div className="page-wrap">
      <h1 className="page-title">Article types</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Supported manuscript categories across Atlas journals.
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {articleTypes.map((type) => (
          <div key={type} className="card px-4 py-3 text-sm font-medium">
            {type}
          </div>
        ))}
      </div>
    </div>
  );
}
