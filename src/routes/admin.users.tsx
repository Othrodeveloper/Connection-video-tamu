import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Ban,
  Copy,
  Gift,
  Info,
  Phone,
  Search,
  Shield,
  StopCircle,
  Undo2,
  Unlock,
  Users,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/app/status-pill";
import { EmptyState, Spinner } from "@/components/app/states";
import { errorMessage } from "@/lib/queries";
import { formatDate, formatDateTime, formatTSh } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { hasSection, useAdminAccess } from "@/lib/admin-access";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Watumiaji — Admin TRANDING VIDEO" },
      {
        name: "description",
        content: "Ona watumiaji wote, nakili namba zao, wathibitishe, wazuie au wape ofa ya siku.",
      },
      { property: "og:title", content: "Watumiaji — Admin TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Ona watumiaji wote, nakili namba zao, wathibitishe, wazuie au wape ofa ya siku.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUsers,
});

type Filter = "all" | "active" | "none" | "verified" | "blocked";

/** 2557XXXXXXXX → 07XXXXXXXX, the way people write numbers in Tanzania. */
function localPhone(p: string | null | undefined) {
  const d = (p ?? "").replace(/\D/g, "");
  return d.startsWith("255") && d.length === 12 ? `0${d.slice(3)}` : d;
}

async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} imenakiliwa`);
  } catch {
    toast.error("Imeshindikana kunakili");
  }
}

function AdminUsers() {
  const qc = useQueryClient();
  const access = useAdminAccess();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [offerFor, setOfferFor] = useState<{ id: string | "all"; name: string } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [p, s, r, pay] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(5000),
        supabase
          .from("subscriptions")
          .select("user_id, expires_at, source")
          .gt("expires_at", nowIso),
        supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
        supabase.from("payments").select("user_id, amount").eq("status", "paid").limit(10000),
      ]);
      if (p.error) throw p.error;
      const exp = new Map<string, string>();
      const hasOffer = new Set<string>();
      for (const x of s.data ?? []) {
        if (!exp.has(x.user_id) || exp.get(x.user_id)! < x.expires_at)
          exp.set(x.user_id, x.expires_at);
        if (x.source === "offer" || x.source === "admin") hasOffer.add(x.user_id);
      }
      const paid = new Map<string, number>();
      for (const x of pay.data ?? []) paid.set(x.user_id, (paid.get(x.user_id) ?? 0) + x.amount);
      const admins = new Set((r.data ?? []).map((x) => x.user_id));
      return (p.data ?? []).map((u) => ({
        ...u,
        expires: exp.get(u.id) ?? null,
        offer: hasOffer.has(u.id),
        admin: admins.has(u.id),
        paid: paid.get(u.id) ?? 0,
      }));
    },
  });
  type U = NonNullable<typeof users.data>[number];
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-user-detail"] });
  };

  async function run(key: string, fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    setBusy(key);
    const { error } = await fn();
    setBusy(null);
    if (error) {
      toast.error(errorMessage(error));
      return false;
    }
    toast.success(ok);
    refresh();
    return true;
  }

  const setFlag = (u: U, field: "is_verified" | "is_blocked", value: boolean) => {
    const msg =
      field === "is_verified"
        ? value
          ? "Amethibitishwa"
          : "Uthibitisho umeondolewa"
        : value
          ? "Akaunti imezuiwa — hataweza kutazama wala kulipia"
          : "Akaunti imefunguliwa";
    if (
      field === "is_blocked" &&
      value &&
      !confirm(`Zuia akaunti ya ${u.full_name || localPhone(u.phone)}?`)
    )
      return;
    return run(
      `${u.id}-${field}`,
      () =>
        supabase
          .from("profiles")
          .update(field === "is_verified" ? { is_verified: value } : { is_blocked: value })
          .eq("id", u.id),
      msg,
    );
  };
  const endAccess = (u: U) => {
    if (!confirm(`Sitisha kifurushi cha ${u.full_name || localPhone(u.phone)} sasa hivi?`)) return;
    return run(
      `${u.id}-end`,
      () => supabase.rpc("admin_end_access", { _user_id: u.id }),
      "Kifurushi kimesitishwa",
    );
  };
  const revokeOffer = (u: U) => {
    if (!confirm("Ondoa siku za ofa ulizompa mtumiaji huyu?")) return;
    return run(
      `${u.id}-revoke`,
      () => supabase.rpc("admin_revoke_offer", { _user_id: u.id }),
      "Ofa imeondolewa",
    );
  };
  const revokeAll = () => {
    if (!confirm("Ondoa ofa zote ulizowapa watumiaji wote? Vifurushi walivyolipia havitaguswa."))
      return;
    return run(
      "revoke-all",
      () => supabase.rpc("admin_revoke_offers_all"),
      "Ofa za wote zimeondolewa",
    );
  };

  const all = users.data ?? [];
  const now = Date.now();
  const counts = {
    all: all.length,
    active: all.filter((u) => u.expires && new Date(u.expires).getTime() > now).length,
    none: all.filter((u) => !u.expires).length,
    verified: all.filter((u) => u.is_verified).length,
    blocked: all.filter((u) => u.is_blocked).length,
  };
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "").replace(/^0/, "").replace(/^255/, "");
    return all.filter((u) => {
      if (filter === "active" && !u.expires) return false;
      if (filter === "none" && u.expires) return false;
      if (filter === "verified" && !u.is_verified) return false;
      if (filter === "blocked" && !u.is_blocked) return false;
      if (!term) return true;
      return (
        u.full_name.toLowerCase().includes(term) ||
        (!!digits && (u.phone ?? "").includes(digits)) ||
        (u.referral_code ?? "").toLowerCase() === term
      );
    });
  }, [all, q, filter]);

  const filters: { k: Filter; l: string }[] = [
    { k: "all", l: "Wote" },
    { k: "active", l: "Wenye kifurushi" },
    { k: "none", l: "Hawana kifurushi" },
    { k: "verified", l: "Waliothibitishwa" },
    { k: "blocked", l: "Waliozuiwa" },
  ];
  const phonesOf = (rows: U[]) => rows.map((u) => localPhone(u.phone)).filter(Boolean);

  return (
    <div className="max-w-5xl">
      <AdminTitle sub={`${counts.all} watumiaji · ${counts.active} wenye kifurushi`}>
        Watumiaji
      </AdminTitle>

      <Panel className="mb-4 p-4">
        <p className="mb-3 text-sm font-bold">Vitendo kwa wote</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="green"
            onClick={() => setOfferFor({ id: "all", name: "watumiaji wote" })}
          >
            <Gift /> Toa ofa kwa wote
          </Button>
          <Button variant="orange" disabled={busy === "revoke-all"} onClick={revokeAll}>
            <Undo2 /> Ondoa ofa kwa wote
          </Button>
          <Button
            variant="blue"
            onClick={() => copyText(phonesOf(list).join("\n"), `Namba ${phonesOf(list).length}`)}
          >
            <Copy /> Nakili namba {filter === "all" && !q ? "zote" : "zilizoonyeshwa"} (
            {phonesOf(list).length})
          </Button>
          <Button variant="soft" onClick={() => copyText(phonesOf(list).join(", "), "Namba")}>
            <Copy /> Nakili kwa mkato (,)
          </Button>
        </div>
      </Panel>

      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              filter === f.k
                ? "bg-gradient-blue text-primary-foreground"
                : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {f.l} ({counts[f.k]})
          </button>
        ))}
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tafuta kwa jina, namba ya simu au namba ya mwaliko…"
          className="pl-9"
        />
      </div>

      {users.isLoading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Hakuna mtumiaji"
          body="Badilisha utafutaji au kichujio."
        />
      ) : (
        <div className="space-y-3">
          {list.map((u) => {
            const active = !!u.expires && new Date(u.expires).getTime() > now;
            const b = (k: string) => busy === `${u.id}-${k}`;
            return (
              <Panel key={u.id} className={cn("p-4", u.is_blocked && "border-destructive/50")}>
                <div className="flex flex-wrap items-start gap-3">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-blue font-display text-2xl text-primary-foreground">
                      {(u.full_name || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 font-bold">
                      {u.full_name || "Bila jina"}
                      {u.is_verified ? (
                        <BadgeCheck
                          className="h-4 w-4 text-blue-glow"
                          aria-label="Amethibitishwa"
                        />
                      ) : null}
                      {u.admin ? <Tag c="bg-gold/15 text-gold">ADMIN</Tag> : null}
                      {u.is_blocked ? (
                        <Tag c="bg-destructive/15 text-destructive">AMEZUIWA</Tag>
                      ) : null}
                      {u.offer && active ? <Tag c="bg-success/15 text-success">OFA</Tag> : null}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono font-semibold">{localPhone(u.phone) || "—"}</span>
                      {u.phone ? (
                        <>
                          <button
                            onClick={() => copyText(localPhone(u.phone), "Namba")}
                            className="rounded-md bg-blue/15 p-1.5 text-blue-glow hover:bg-blue/25"
                            aria-label="Nakili namba"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <a
                            href={`tel:+${u.phone}`}
                            className="rounded-md bg-success/15 p-1.5 text-success hover:bg-success/25"
                            aria-label="Piga simu"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/${u.phone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md bg-brand-whatsapp/15 p-1.5 text-brand-whatsapp hover:bg-brand-whatsapp/25"
                            aria-label="WhatsApp"
                          >
                            <FaWhatsapp className="h-3.5 w-3.5" />
                          </a>
                        </>
                      ) : null}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                      <span>
                        Alijiunga: <b className="text-foreground">{formatDate(u.created_at)}</b>
                      </span>
                      <span>
                        Kifurushi:{" "}
                        <b className={active ? "text-success" : "text-foreground"}>
                          {active ? `hadi ${formatDateTime(u.expires!)}` : "hana"}
                        </b>
                      </span>
                      <span>
                        Amelipa: <b className="text-gold">{formatTSh(u.paid)}</b>
                      </span>
                      <span>
                        Mwaliko: <b className="text-foreground">{u.referral_code ?? "—"}</b>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="green"
                    onClick={() =>
                      setOfferFor({ id: u.id, name: u.full_name || localPhone(u.phone) })
                    }
                  >
                    <Gift /> Mpe ofa
                  </Button>
                  {u.offer && active ? (
                    <Button
                      size="sm"
                      variant="orange"
                      disabled={b("revoke")}
                      onClick={() => revokeOffer(u)}
                    >
                      <Undo2 /> Ondoa ofa
                    </Button>
                  ) : null}
                  {active ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={b("end")}
                      onClick={() => endAccess(u)}
                    >
                      <StopCircle /> Sitisha kifurushi
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant={u.is_verified ? "outline" : "blue"}
                    disabled={b("is_verified")}
                    onClick={() => setFlag(u, "is_verified", !u.is_verified)}
                  >
                    <BadgeCheck /> {u.is_verified ? "Ondoa uthibitisho" : "Thibitisha"}
                  </Button>
                  <Button
                    size="sm"
                    variant={u.is_blocked ? "green" : "outline"}
                    className={u.is_blocked ? "" : "text-destructive"}
                    disabled={b("is_blocked")}
                    onClick={() => setFlag(u, "is_blocked", !u.is_blocked)}
                  >
                    {u.is_blocked ? (
                      <>
                        <Unlock /> Fungua akaunti
                      </>
                    ) : (
                      <>
                        <Ban /> Zuia akaunti
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="purple" onClick={() => setDetail(u.id)}>
                    <Info /> Maelezo
                  </Button>
                  {hasSection(access.data, "admins") ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/admin/staff">
                        <Shield /> Ruhusa za admin
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <OfferDialog target={offerFor} onClose={() => setOfferFor(null)} onDone={refresh} />
      <DetailDialog
        userId={detail}
        user={all.find((u) => u.id === detail) ?? null}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function Tag({ children, c }: { children: ReactNode; c: string }) {
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", c)}>{children}</span>;
}

const QUICK_DAYS = [1, 3, 7, 14, 30];

function OfferDialog({
  target,
  onClose,
  onDone,
}: {
  target: { id: string | "all"; name: string } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  async function give() {
    const n = Number(days);
    if (!target || !n || n < 1) {
      toast.error("Chagua idadi ya siku");
      return;
    }
    setBusy(true);
    const res =
      target.id === "all"
        ? await supabase.rpc("admin_grant_days_all", { _days: n })
        : await supabase.rpc("admin_grant_days", { _user_id: target.id, _days: n });
    setBusy(false);
    if (res.error) {
      toast.error(errorMessage(res.error));
      return;
    }
    toast.success(
      target.id === "all"
        ? `Watumiaji ${res.data as number} wamepewa siku ${n}`
        : `Amepewa siku ${n} za bure`,
    );
    onDone();
    onClose();
  }
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle className="font-display text-3xl">Toa Ofa ya Siku</DialogTitle>
        <DialogDescription>
          Siku za bure kwa <b className="text-foreground">{target?.name}</b>. Zinaongezwa juu ya
          kifurushi alichonacho.
          {target?.id === "all" ? " Waliozuiwa hawatapewa." : ""}
        </DialogDescription>
        <div className="flex flex-wrap gap-2">
          {QUICK_DAYS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(String(d))}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold",
                days === String(d)
                  ? "bg-gradient-green text-primary-foreground"
                  : "bg-surface-2 text-muted-foreground",
              )}
            >
              {d === 1
                ? "Siku 1"
                : d === 7
                  ? "Wiki 1"
                  : d === 14
                    ? "Wiki 2"
                    : d === 30
                      ? "Mwezi 1"
                      : `Siku ${d}`}
            </button>
          ))}
        </div>
        <label className="text-xs font-semibold text-muted-foreground">
          Au andika idadi ya siku
        </label>
        <Input
          inputMode="numeric"
          value={days}
          onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Ghairi
          </Button>
          <Button variant="green" disabled={busy} onClick={give}>
            {busy ? <Spinner className="h-4 w-4" /> : <Gift />} Toa siku {days || 0}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const SOURCE: Record<string, string> = {
  payment: "Malipo",
  admin: "Ofa ya admin",
  offer: "Ofa kwa wote",
  referral: "Zawadi ya mwaliko",
};

function DetailDialog({
  userId,
  user,
  onClose,
}: {
  userId: string | null;
  user: { full_name: string; phone: string | null } | null;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ["admin-user-detail", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [pay, subs, watched] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("watch_progress")
          .select("video_id, updated_at, video:videos(title)")
          .eq("user_id", userId!)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);
      return { payments: pay.data ?? [], subs: subs.data ?? [], watched: watched.data ?? [] };
    },
  });
  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogTitle className="font-display text-3xl">{user?.full_name || "Mtumiaji"}</DialogTitle>
        <DialogDescription>{formatPhone(user?.phone)}</DialogDescription>
        {detail.isLoading || !detail.data ? (
          <Spinner />
        ) : (
          <div className="space-y-5 text-sm">
            <section>
              <h3 className="mb-2 font-bold">Malipo ({detail.data.payments.length})</h3>
              {detail.data.payments.length === 0 ? (
                <p className="text-muted-foreground">Hajalipia bado.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {detail.data.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2">
                      <span>
                        {p.package_name}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(p.created_at)}
                        </span>
                      </span>
                      <span className="text-right">
                        <b>{formatTSh(p.amount)}</b>
                        <br />
                        <StatusPill status={p.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="mb-2 font-bold">Siku alizopata</h3>
              {detail.data.subs.length === 0 ? (
                <p className="text-muted-foreground">Hakuna.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {detail.data.subs.map((s) => (
                    <li key={s.id} className="flex justify-between py-2">
                      <span>{SOURCE[s.source] ?? s.source}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.starts_at)} → {formatDate(s.expires_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="mb-2 font-bold">Alichotazama karibuni</h3>
              {detail.data.watched.length === 0 ? (
                <p className="text-muted-foreground">Bado hajatazama.</p>
              ) : (
                <ul className="space-y-1">
                  {detail.data.watched.map((w, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{(w.video as { title: string } | null)?.title ?? "Video"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(w.updated_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
