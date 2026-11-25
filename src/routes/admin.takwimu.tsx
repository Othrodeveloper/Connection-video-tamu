import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Heart, Play, Search, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { EmptyState, Spinner } from "@/components/app/states";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/takwimu")({
  head: () => ({
    meta: [
      { title: "Takwimu za Video — Admin TRANDING VIDEO" },
      {
        name: "description",
        content: "Mara kila video ilivyochezwa, watu walioitazama na asilimia.",
      },
      { property: "og:title", content: "Takwimu za Video — Admin TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Mara kila video ilivyochezwa, watu walioitazama na asilimia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideoStats,
});

const TONES = [
  "bg-gradient-blue",
  "bg-gradient-primary",
  "bg-gradient-green",
  "bg-gradient-purple",
  "bg-gradient-orange",
];
type SortKey = "views" | "plays_week" | "plays_today" | "viewers";

function VideoStats() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("views");
  const stats = useQuery({
    queryKey: ["admin-video-stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_video_stats");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        plays_today: Number(r.plays_today),
        plays_week: Number(r.plays_week),
        viewers: Number(r.viewers),
      }));
    },
  });

  if (stats.isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-10 w-10" />
      </div>
    );
  const rows = stats.data ?? [];
  const total = rows.reduce((s, r) => s + r.views, 0);
  const today = rows.reduce((s, r) => s + r.plays_today, 0);
  const week = rows.reduce((s, r) => s + r.plays_week, 0);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
  const list = rows
    .filter((r) => r.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b[sort] - a[sort]);
  const chart = [...rows]
    .sort((a, b) => b.views - a.views)
    .slice(0, 8)
    .map((r) => ({
      name: r.title.length > 12 ? r.title.slice(0, 12) + "…" : r.title,
      Mara: r.views,
    }));

  const sorts: { k: SortKey; l: string }[] = [
    { k: "views", l: "Zote" },
    { k: "plays_week", l: "Siku 7" },
    { k: "plays_today", l: "Leo" },
    { k: "viewers", l: "Watu" },
  ];

  return (
    <div>
      <AdminTitle sub="Kila video inapochezwa inahesabiwa hapa">Takwimu za Video</AdminTitle>
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "Mara zote zilizochezwa", v: total, t: "bg-gradient-blue" },
          { l: "Siku 7 zilizopita", v: week, t: "bg-gradient-purple" },
          { l: "Leo", v: today, t: "bg-gradient-green" },
        ].map((c) => (
          <Panel key={c.l} className="p-4">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground",
                c.t,
              )}
            >
              <Play className="h-4 w-4 fill-current" />
            </span>
            <p className="mt-3 font-display text-3xl leading-none">{c.v.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.l}</p>
          </Panel>
        ))}
      </div>

      {chart.length ? (
        <Panel className="mt-4 p-5">
          <h2 className="mb-4 font-bold">Video 8 zinazochezwa zaidi</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="Mara" fill="var(--blue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta video…"
            className="pl-9"
          />
        </div>
        <div className="flex rounded-lg border border-border bg-surface p-1">
          {sorts.map((s) => (
            <button
              key={s.k}
              onClick={() => setSort(s.k)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-bold",
                sort === s.k ? "bg-gradient-blue text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Play className="h-6 w-6" />}
            title="Hakuna video bado"
            body="Ukiweka video, takwimu zake zitaonekana hapa."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {list.map((r, i) => {
            const share = pct(r.views);
            return (
              <Panel key={r.id} className="flex items-center gap-3 p-3">
                <span className="w-6 text-center font-display text-2xl text-muted-foreground">
                  {i + 1}
                </span>
                {r.thumbnail_url ? (
                  <img
                    src={r.thumbnail_url}
                    alt=""
                    className="h-14 w-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="h-14 w-10 shrink-0 rounded bg-surface-2" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold">{r.title}</p>
                    <span className="shrink-0 font-display text-2xl leading-none text-blue-glow">
                      {share}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {r.kind === "series" ? "Tamthilia" : "Filamu"} · {r.category ?? "Nyinginezo"}
                  </p>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn("h-full rounded-full", TONES[i % TONES.length])}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Play className="h-3 w-3 text-blue-glow" /> Mara {r.views.toLocaleString()}
                    </span>
                    <span>Leo {r.plays_today}</span>
                    <span>Siku 7: {r.plays_week}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3 text-success" /> Watu {r.viewers}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3 text-primary" /> {r.likes_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 text-gold" /> {Number(r.rating_avg).toFixed(1)} (
                      {r.rating_count})
                    </span>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
