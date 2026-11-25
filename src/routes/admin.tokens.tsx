import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Copy, KeyRound, Plus, Search, Trash2, UserCheck } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminTitle, FieldRow, Panel, selectCls } from "@/components/admin/admin-ui";
import { EmptyState, Spinner } from "@/components/app/states";
import { errorMessage, useGroups, usePackages } from "@/lib/queries";
import { formatDateTime, formatTSh } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import {
  deleteAccessToken,
  generateAccessToken,
  listAccessTokens,
  type EnrichedAccessToken,
} from "@/lib/tokens.functions";

export const Route = createFileRoute("/admin/tokens")({
  head: () => ({
    meta: [
      { title: "Access PIN / Tokeni — Admin TRANDING VIDEO" },
      {
        name: "description",
        content: "Tengeneza Access PIN za vocha kulingana na akaunti na kifurushi cha mtumiaji.",
      },
      { property: "og:title", content: "Access PIN / Tokeni — Admin TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Tengeneza Access PIN za vocha kulingana na akaunti na kifurushi cha mtumiaji.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminTokens,
});

type Filter = "all" | "unused" | "used";

async function copyPin(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toast.success(`Access PIN ${code} imenakiliwa`);
  } catch {
    toast.error("Imeshindikana kunakili");
  }
}

function waShareHref(t: EnrichedAccessToken): string | null {
  const digits = (t.user_phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const text = `Habari ${t.user_name || "mteja"},\nAccess PIN yako ya kufungua *${t.package_name}* (${formatTSh(t.amount)}) kwenye TRANDING VIDEO ni:\n\n*${t.code}*\n\nIngia kwenye akaunti yako kisha chagua "Lipia kwa Manual" na ujaze PIN hii. (Inafanya kazi kwa akaunti yako pekee).`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function AdminTokens() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAccessTokens);
  const createFn = useServerFn(generateAccessToken);
  const removeFn = useServerFn(deleteAccessToken);

  const packages = usePackages();
  const groups = useGroups();

  const users = useQuery({
    queryKey: ["admin-token-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, is_blocked")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const tokens = useQuery({
    queryKey: ["admin-access-tokens"],
    queryFn: () => listFn(),
    refetchInterval: 20_000,
  });

  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [latest, setLatest] = useState<EnrichedAccessToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [listSearch, setListSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    const digits = term.replace(/\D/g, "").replace(/^0/, "").replace(/^255/, "");
    return (users.data ?? []).filter((u) => {
      if (!term) return true;
      return (
        u.full_name.toLowerCase().includes(term) || (!!digits && (u.phone ?? "").includes(digits))
      );
    });
  }, [users.data, userSearch]);

  const paidGroups = useMemo(
    () => (groups.data ?? []).filter((g) => g.is_paid && g.price > 0),
    [groups.data],
  );

  const filteredTokens = useMemo(() => {
    const term = listSearch.trim().toLowerCase();
    return (tokens.data ?? []).filter((t) => {
      if (filter === "unused" && t.used_at) return false;
      if (filter === "used" && !t.used_at) return false;
      if (!term) return true;
      return (
        t.code.toLowerCase().includes(term) ||
        t.user_name.toLowerCase().includes(term) ||
        t.user_phone.toLowerCase().includes(term) ||
        t.package_name.toLowerCase().includes(term)
      );
    });
  }, [tokens.data, filter, listSearch]);

  async function generate() {
    if (!selectedUserId) {
      toast.error("Chagua akaunti ya mtumiaji kwanza");
      return;
    }
    if (!selectedTarget) {
      toast.error("Chagua kifurushi au group la kufungua");
      return;
    }
    const [kind, targetId] = selectedTarget.split(":");
    if (!targetId || (kind !== "pkg" && kind !== "grp")) {
      toast.error("Chaguo la kifurushi si sahihi");
      return;
    }

    setBusy(true);
    try {
      const res = await createFn({
        data: {
          userId: selectedUserId,
          ...(kind === "pkg" ? { packageId: targetId } : { groupId: targetId }),
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLatest(res.token);
      toast.success(`Access PIN ${res.token.code} imetengenezwa`);
      await qc.invalidateQueries({ queryKey: ["admin-access-tokens"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Futa Access PIN hii?")) return;
    setDeletingId(id);
    try {
      const res = await removeFn({ data: { tokenId: id } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Tokeni imefutwa");
      if (latest?.id === id) setLatest(null);
      await qc.invalidateQueries({ queryKey: ["admin-access-tokens"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  const counts = {
    all: (tokens.data ?? []).length,
    unused: (tokens.data ?? []).filter((t) => !t.used_at).length,
    used: (tokens.data ?? []).filter((t) => !!t.used_at).length,
  };

  return (
    <div className="max-w-5xl space-y-6">
      <AdminTitle sub="Tengeneza Access PIN za vocha kulingana na akaunti aliyojisajili mteja na kifurushi alicholipia. Tokeni itakubali kwenye akaunti yake tu.">
        Access PIN &amp; Tokeni
      </AdminTitle>

      <Panel className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-gold" />
          <h2 className="font-bold">Tengeneza Access PIN Mpya</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldRow label="1. Tafuta na chagua akaunti ya mtumiaji">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Tafuta jina au namba ya simu…"
                    className="pl-9"
                  />
                </div>
                <select
                  aria-label="Chagua mtumiaji"
                  className={selectCls}
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">— Chagua akaunti ({filteredUsers.length}) —</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || "Bila jina"} — {formatPhone(u.phone) || "Hana simu"}
                      {u.is_blocked ? " (Amezuiwa)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </FieldRow>
          </div>

          <div className="space-y-2">
            <FieldRow label="2. Chagua kifurushi au group la kulipia">
              <select
                aria-label="Chagua kifurushi au group"
                className={selectCls}
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
              >
                <option value="">— Chagua kifurushi / group —</option>
                {(packages.data ?? []).length > 0 ? (
                  <optgroup label="Vifurushi vya Video">
                    {(packages.data ?? []).map((p) => (
                      <option key={p.id} value={`pkg:${p.id}`}>
                        {p.name} ({p.duration_days} siku) — {formatTSh(p.price)}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {paidGroups.length > 0 ? (
                  <optgroup label="Magroup ya Kulipia">
                    {paidGroups.map((g) => (
                      <option key={g.id} value={`grp:${g.id}`}>
                        Group: {g.name} — {formatTSh(g.price)}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </FieldRow>
            <p className="text-xs text-muted-foreground">
              PIN hii itafungua kifurushi/group ulichochagua tu, na kwa akaunti hiyo pekee.
            </p>
          </div>
        </div>

        <Button variant="hero" onClick={generate} disabled={busy || users.isLoading}>
          {busy ? <Spinner className="h-4 w-4 text-primary-foreground" /> : <Plus />} Tengeneza
          Access PIN
        </Button>

        {latest ? (
          <div className="rounded-xl border border-success/40 bg-success/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-success">
                  Access PIN Imetengenezwa
                </p>
                <p className="mt-1 font-mono text-2xl font-extrabold tracking-widest text-foreground">
                  {latest.code}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserCheck className="h-3.5 w-3.5 text-blue-glow" />
                  <span>
                    {latest.user_name} ({formatPhone(latest.user_phone)}) ·{" "}
                    <strong>{latest.package_name}</strong> ({formatTSh(latest.amount)})
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="blue" onClick={() => copyPin(latest.code)}>
                  <Copy /> Nakili PIN
                </Button>
                {waShareHref(latest) ? (
                  <Button size="sm" variant="green" asChild>
                    <a href={waShareHref(latest)!} target="_blank" rel="noreferrer">
                      <FaWhatsapp className="h-4 w-4" /> Tuma WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Panel>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { k: "all", l: "Zote" },
                { k: "unused", l: "Hazijatumika" },
                { k: "used", l: "Zimetumika" },
              ] as const
            ).map((f) => (
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
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Tafuta PIN, jina au simu…"
              className="pl-9"
            />
          </div>
        </div>

        {tokens.isLoading ? (
          <Spinner />
        ) : filteredTokens.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-6 w-6" />}
            title="Hakuna Access PIN bado"
            body="Tengeneza Access PIN hapo juu baada ya mteja kulipia kwa njia ya manual."
          />
        ) : (
          <div className="space-y-2">
            {filteredTokens.map((t) => {
              const wa = !t.used_at ? waShareHref(t) : null;
              return (
                <Panel key={t.id} className="flex flex-wrap items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-surface-2 px-2.5 py-1 font-mono text-sm font-extrabold tracking-wider text-gold">
                        {t.code}
                      </span>
                      {t.used_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Imetumika
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue/15 px-2.5 py-0.5 text-xs font-bold text-blue-glow">
                          <Clock className="h-3.5 w-3.5" /> Inasubiri kutumika
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold">
                      {t.user_name} ·{" "}
                      <span className="text-muted-foreground">
                        {formatPhone(t.user_phone) || t.user_id}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.package_name} ({formatTSh(t.amount)}) · Iliundwa{" "}
                      {formatDateTime(t.created_at)}
                      {t.used_at ? ` · Ilitumika ${formatDateTime(t.used_at)}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => copyPin(t.code)}
                      aria-label={`Nakili ${t.code}`}
                    >
                      <Copy /> Nakili
                    </Button>
                    {wa ? (
                      <Button size="sm" variant="green" asChild>
                        <a href={wa} target="_blank" rel="noreferrer">
                          <FaWhatsapp className="h-4 w-4" /> WhatsApp
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      disabled={deletingId === t.id}
                      onClick={() => remove(t.id)}
                      aria-label="Futa tokeni"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
