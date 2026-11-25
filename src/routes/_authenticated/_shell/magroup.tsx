import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, LayoutGrid, List, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageContainer, PageTitle } from "@/components/app/app-shell";
import { EmptyState, ErrorState, Spinner } from "@/components/app/states";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, qk, useGroups, useMemberships, type Group } from "@/lib/queries";
import { formatTSh } from "@/lib/format";
import { usePaywall } from "@/components/app/paywall";
import { GroupIntroduction } from "@/components/app/group-slides";
import { cn } from "@/lib/utils";
import { useText } from "@/lib/site-text";

export const Route = createFileRoute("/_authenticated/_shell/magroup")({
  head: () => ({
    meta: [
      { title: "Magroup — TRANDING VIDEO" },
      {
        name: "description",
        content: "Jiunge na magroup ya biashara, filamu, muziki, elimu na mengineyo.",
      },
      { property: "og:title", content: "Magroup — TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Jiunge na magroup ya biashara, filamu, muziki, elimu na mengineyo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const groups = useGroups();
  const memberships = useMemberships();
  const [cat, setCat] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const paywall = usePaywall();
  const t = useText();

  const categories = useMemo(
    () => [...new Set((groups.data ?? []).map((g) => g.category))],
    [groups.data],
  );
  const list = (groups.data ?? []).filter((g) => !cat || g.category === cat);
  const statusFor = (id: string) => memberships.data?.find((m) => m.group_id === id)?.status;

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-surface text-muted-foreground hover:text-foreground",
    );

  return (
    <PageContainer>
      <GroupIntroduction />
      <PageTitle sub={t("groups.sub")}>{t("groups.title")}</PageTitle>
      <div className="flex items-center gap-2">
        <div className="scrollbar-none -ml-4 flex flex-1 gap-2 overflow-x-auto pl-4">
          <button className={chip(!cat)} onClick={() => setCat(null)}>
            Zote
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={chip(cat === c)}
              onClick={() => setCat(cat === c ? null : c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 rounded-lg border border-border bg-surface p-0.5">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "rounded-md p-1.5",
              view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
            aria-label="Mpangilio wa gridi"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "rounded-md p-1.5",
              view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
            aria-label="Mpangilio wa orodha"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5">
        {groups.isError ? (
          <ErrorState onRetry={() => groups.refetch()} />
        ) : groups.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer h-72 rounded-2xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Hakuna magroup hapa"
            body="Chagua kategoria nyingine."
          />
        ) : (
          <div
            className={cn(
              view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3",
            )}
          >
            {list.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                status={statusFor(g.id)}
                view={view}
                onPay={() => paywall.open({ groupId: g.id })}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function GroupCard({
  group,
  status,
  view,
  onPay,
}: {
  group: Group;
  status?: string | undefined;
  view: "grid" | "list";
  onPay: () => void;
}) {
  const qc = useQueryClient();
  const { userId } = useAuth();
  const [busy, setBusy] = useState(false);
  const isMember = status === "joined" || status === "paid";

  const link = useQuery({
    queryKey: ["group-link", group.id, status],
    enabled: isMember,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_group_link", { _group_id: group.id });
      if (error) throw error;
      return data as string | null;
    },
  });

  async function joinFree() {
    setBusy(true);
    const { error } = await supabase.rpc("join_group", { _group_id: group.id, _phone: "" });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success(`Umejiunga na ${group.name}!`);
    qc.invalidateQueries({ queryKey: qk.memberships(userId) });
    qc.invalidateQueries({ queryKey: qk.groups });
  }

  const action = isMember ? (
    <Button variant="gold" className="w-full" asChild disabled={!link.data}>
      <a href={link.data ?? "#"} target="_blank" rel="noreferrer">
        <ExternalLink /> Fungua Group
      </a>
    </Button>
  ) : status === "pending" ? (
    <Button variant="outline" className="w-full" onClick={onPay}>
      <Spinner className="h-4 w-4" /> Inasubiri Uthibitisho
    </Button>
  ) : group.is_paid ? (
    <Button variant="hero" className="w-full" onClick={onPay}>
      <Lock /> Lipia Kujiunga · {formatTSh(group.price)}
    </Button>
  ) : (
    <Button variant="hero" className="w-full" onClick={joinFree} disabled={busy}>
      {busy ? <Spinner className="h-4 w-4 text-primary-foreground" /> : <Users />} Jiunge Sasa
    </Button>
  );

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-primary/40",
        view === "list" && "flex",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          view === "grid" ? "aspect-[16/9]" : "w-28 sm:w-44",
        )}
      >
        {group.image_url ? (
          <img
            src={group.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-surface-2">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-scrim px-2.5 py-1 text-[11px] font-bold backdrop-blur">
          {group.category}
        </span>
        {group.is_paid ? (
          <span className="absolute right-2 top-2 rounded-full bg-gold px-2.5 py-1 text-[11px] font-extrabold text-gold-foreground">
            VIP
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-tight">{group.name}</h3>
          {isMember ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Mwanachama" />
          ) : null}
        </div>
        <p
          className={cn(
            "mt-1 text-sm text-muted-foreground",
            view === "grid" ? "line-clamp-2" : "line-clamp-2 sm:line-clamp-3",
          )}
        >
          {group.description}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {group.members_count.toLocaleString()} wanachama
          </span>
          <span className={cn("font-bold", group.is_paid ? "text-gold" : "text-success")}>
            {group.is_paid ? formatTSh(group.price) : "Bure"}
          </span>
        </div>
        <div className="mt-auto pt-4">{action}</div>
      </div>
    </article>
  );
}
