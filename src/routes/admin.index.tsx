import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CreditCard,
  Eye,
  Film,
  Globe,
  Radio,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/app/status-pill";
import { Spinner } from "@/components/app/states";
import { formatDateTime, formatTSh } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Admin TRANDING VIDEO" },
      {
        name: "description",
        content: "Wageni, watazamaji, filamu zinazotazamwa na malipo kwa asilimia.",
      },
      { property: "og:title", content: "Dashboard — Admin TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Wageni, watazamaji, filamu zinazotazamwa na malipo kwa asilimia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

interface Analytics {
  visits: number;
  visitors: number;
  signed_in_visitors: number;
  today_visitors: number;
  online_now: number;
  total_users: number;
  new_users: number;
  subscribed_users: number;
  period_views: number;
  all_views: number;
  viewers: number;
  daily: { day: string; visits: number; visitors: number; views: number }[];
  pages: { path: string; visits: number }[];
  videos: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    views: number;
    period_views: number;
    viewers: number;
  }[];
}

const PAGE_NAMES: Record<string, string> = {
  "/": "Ukurasa wa mwanzo",
  "/auth": "Kuingia / Kujisajili",
  "/home": "Nyumbani",
  "/tafuta": "Tafuta",
  "/profile": "Wasifu",
  "/magroup": "Magroup",
  "/arifa": "Arifa",
  "/orodha": "Orodha yangu",
  "/karibu": "Karibu",
};
function pageName(p: string) {
  if (PAGE_NAMES[p]) return PAGE_NAMES[p];
  if (p.startsWith("/video/")) return "Maelezo ya video";
  if (p.startsWith("/tazama/")) return "Kutazama video";
  return p;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const BAR_TONES = [
  "bg-gradient-blue",
  "bg-gradient-primary",
  "bg-gradient-green",
  "bg-gradient-purple",
  "bg-gradient-orange",
];

function Dashboard() {
  const [days, setDays] = useState(7);
  const analytics = useQuery({
    queryKey: ["admin-analytics", days],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_analytics", { _days: days });
      if (error) throw error;
      return data as unknown as Analytics;
    },
  });
  const money = useQuery({
    queryKey: ["admin-stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [videos, paid, pending, recent] = await Promise.all([
        supabase.from("videos").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount").eq("status", "paid").limit(10000),
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      return {
        videos: videos.count ?? 0,
        revenue: (paid.data ?? []).reduce((s, r) => s + r.amount, 0),
        pending: pending.count ?? 0,
        recent: recent.data ?? [],
      };
    },
  });

  if (analytics.isLoading || money.isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-10 w-10" />
      </div>
    );
  if (analytics.error)
    return <p className="text-sm text-destructive">Takwimu hazikupatikana. Jaribu tena.</p>;
  const a = analytics.data!;
  const m = money.data!;
  const totalViews = a.videos.reduce((s, v) => s + v.views, 0);

  const cards = [
    { l: "Wageni (watu tofauti)", v: a.visitors, icon: Globe, tone: "bg-gradient-blue" },
    { l: "Wageni leo", v: a.today_visitors, icon: Users, tone: "bg-gradient-purple" },
    { l: "Wako sasa hivi", v: a.online_now, icon: Radio, tone: "bg-gradient-green" },
    { l: "Kurasa zilizofunguliwa", v: a.visits, icon: Eye, tone: "bg-gradient-orange" },
    { l: "Watumiaji wote", v: a.total_users, icon: UserCheck, tone: "bg-gradient-blue" },
    { l: "Wenye kifurushi", v: a.subscribed_users, icon: TrendingUp, tone: "bg-gradient-green" },
    { l: "Mara video zilizochezwa", v: a.all_views, icon: Film, tone: "bg-gradient-primary" },
    { l: "Mapato", v: formatTSh(m.revenue), icon: Wallet, tone: "bg-gradient-gold" },
    {
      l: "Malipo yanasubiri",
      v: m.pending,
      icon: CreditCard,
      tone: "bg-gradient-orange",
      alert: m.pending > 0,
    },
  ];

  const rates = [
    {
      l: "Wageni walioingia kwenye akaunti",
      v: pct(a.signed_in_visitors, a.visitors),
      sub: `${a.signed_in_visitors} kati ya ${a.visitors}`,
    },
    {
      l: "Watumiaji wenye kifurushi",
      v: pct(a.subscribed_users, a.total_users),
      sub: `${a.subscribed_users} kati ya ${a.total_users}`,
    },
    {
      l: "Watumiaji waliotazama video",
      v: pct(a.viewers, a.total_users),
      sub: `${a.viewers} kati ya ${a.total_users}`,
    },
    {
      l: "Watumiaji wapya kipindi hiki",
      v: pct(a.new_users, a.total_users),
      sub: `${a.new_users} wapya`,
    },
  ];

  const chart = a.daily.map((d) => ({
    ...d,
    label: d.day.slice(5).split("-").reverse().join("/"),
  }));
  const pageTotal = a.pages.reduce((s, p) => s + p.visits, 0);

  return (
    <div>
      <AdminTitle
        sub="Takwimu zinasasishwa zenyewe kila nusu dakika"
        action={
          <div className="flex rounded-lg border border-border bg-surface p-1">
            {[1, 7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-bold",
                  days === d ? "bg-gradient-blue text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {d === 1 ? "Leo" : `Siku ${d}`}
              </button>
            ))}
          </div>
        }
      >
        Dashboard
      </AdminTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <Panel key={c.l} className={cn("p-4", c.alert && "border-orange/60")}>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground",
                c.tone,
              )}
            >
              <c.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 font-display text-3xl leading-none">
              {typeof c.v === "number" ? c.v.toLocaleString() : c.v}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{c.l}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rates.map((r) => (
          <Panel key={r.l} className="p-4">
            <div className="flex items-end justify-between">
              <p className="font-display text-3xl leading-none text-blue-glow">{r.v}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-blue"
                style={{ width: `${Math.min(r.v, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold">{r.l}</p>
            <p className="text-[11px] text-muted-foreground">{r.sub}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4 p-5">
        <h2 className="mb-1 font-bold">Wageni na video zilizochezwa kila siku</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Bluu = wageni · Nyekundu = video zilizochezwa
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ left: -20, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--blue)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--foreground)",
                }}
                formatter={(v: number, k: string) => [
                  v,
                  k === "visitors" ? "Wageni" : k === "views" ? "Video zilizochezwa" : "Kurasa",
                ]}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="var(--blue)"
                strokeWidth={2}
                fill="url(#gVisitors)"
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#gViews)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="font-bold">Filamu zilizotazamwa zaidi</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Asilimia ya mara zote video zilizochezwa, na idadi ya watu waliotazama
          </p>
          {a.videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hakuna video bado.</p>
          ) : (
            <ul className="space-y-3">
              {a.videos.map((v, i) => {
                const share = pct(v.views, totalViews);
                return (
                  <li key={v.id} className="flex items-center gap-3">
                    {v.thumbnail_url ? (
                      <img
                        src={v.thumbnail_url}
                        alt=""
                        className="h-12 w-8 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="h-12 w-8 shrink-0 rounded bg-surface-2" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{v.title}</p>
                        <span className="shrink-0 font-display text-xl leading-none">{share}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn("h-full rounded-full", BAR_TONES[i % BAR_TONES.length])}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Mara {v.views.toLocaleString()} · Watu {v.viewers.toLocaleString()} ·
                        Kipindi hiki {v.period_views.toLocaleString()}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel className="p-5">
            <h2 className="font-bold">Kurasa zinazotembelewa</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Asilimia ya kurasa zilizofunguliwa kipindi hiki
            </p>
            {a.pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bado hakuna wageni kwenye kipindi hiki.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {a.pages.map((p, i) => {
                  const share = pct(p.visits, pageTotal);
                  return (
                    <li key={p.path}>
                      <div className="flex justify-between text-sm">
                        <span className="truncate font-semibold">{pageName(p.path)}</span>
                        <span className="text-muted-foreground">
                          {p.visits} · {share}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn("h-full rounded-full", BAR_TONES[i % BAR_TONES.length])}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Malipo ya karibuni</h2>
              <Link to="/admin/payments" className="text-xs font-semibold text-blue-glow">
                Ona yote →
              </Link>
            </div>
            {m.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Hakuna malipo bado.</p>
            ) : (
              <ul className="divide-y divide-border">
                {m.recent.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{formatPhone(p.phone)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.package_name} · {formatDateTime(p.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatTSh(p.amount)}</p>
                      <StatusPill status={p.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
