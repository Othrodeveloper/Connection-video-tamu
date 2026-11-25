import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/app/app-shell";
import { VideoCard } from "@/components/app/video-card";
import { EmptyState, ErrorState } from "@/components/app/states";
import { useCatalog, useCategories, useSubscription } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/tafuta")({
  head: () => ({
    meta: [
      { title: "Tafuta — TRANDING VIDEO" },
      { name: "description", content: "Tafuta filamu na tamthilia kwa jina, kategoria au mwaka." },
      { property: "og:title", content: "Tafuta — TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Tafuta filamu na tamthilia kwa jina, kategoria au mwaka.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

type Sort = "new" | "popular";

function SearchPage() {
  const catalog = useCatalog();
  const categories = useCategories();
  const sub = useSubscription();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>("new");

  const years = useMemo(
    () =>
      [...new Set((catalog.data ?? []).map((v) => v.year).filter((y): y is number => !!y))].sort(
        (a, b) => b - a,
      ),
    [catalog.data],
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (catalog.data ?? []).filter((v) => {
      if (cat && v.category_id !== cat) return false;
      if (year && v.year !== year) return false;
      if (!term) return true;
      return (
        v.title.toLowerCase().includes(term) ||
        (v.category?.name ?? "").toLowerCase().includes(term) ||
        String(v.year ?? "").includes(term)
      );
    });
    return list.sort((a, b) =>
      sort === "new" ? +new Date(b.publish_at) - +new Date(a.publish_at) : b.views - a.views,
    );
  }, [catalog.data, q, cat, year, sort]);

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-surface text-muted-foreground hover:text-foreground",
    );

  return (
    <PageContainer>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tafuta jina, kategoria au mwaka…"
          className="h-13 rounded-xl bg-surface pl-12 pr-10 text-base"
          aria-label="Tafuta"
        />
        {q ? (
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Futa"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <button className={chip(!cat)} onClick={() => setCat(null)}>
          Zote
        </button>
        {(categories.data ?? []).map((c) => (
          <button
            key={c.id}
            className={chip(cat === c.id)}
            onClick={() => setCat(cat === c.id ? null : c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={year ?? ""}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
          className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
          aria-label="Mwaka"
        >
          <option value="">Mwaka wowote</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div className="ml-auto flex rounded-lg border border-border bg-surface p-0.5 text-xs font-semibold">
          {(["new", "popular"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "rounded-md px-3 py-1.5",
                sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {s === "new" ? "Mpya" : "Maarufu"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {catalog.isError ? (
          <ErrorState onRetry={() => catalog.refetch()} />
        ) : catalog.isLoading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="shimmer aspect-[2/3] rounded-lg" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title="Hakuna matokeo"
            body="Jaribu jina lingine, ondoa kichujio au chagua kategoria tofauti."
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">Matokeo {results.length}</p>
            <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-7">
              {results.map((v) => (
                <VideoCard
                  key={v.id}
                  video={v}
                  locked={!sub.active}
                  className="w-auto max-w-none sm:w-auto lg:w-auto"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
