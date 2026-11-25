import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/app/status-pill";
import { EmptyState, Spinner } from "@/components/app/states";
import { errorMessage } from "@/lib/queries";
import { formatDateTime, formatTSh } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Malipo — Admin TRANDING VIDEO" },
      { name: "description", content: "Thibitisha au kataa malipo ya vifurushi na magroup." },
      { property: "og:title", content: "Malipo — Admin TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Thibitisha au kataa malipo ya vifurushi na magroup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Payments,
});

type Filter = "pending" | "all";

async function namesFor(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((p) => [p.id, p.full_name]));
}

function Payments() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"packages" | "groups">("packages");
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pkgPays = useQuery({
    queryKey: ["admin-payments", filter, tab],
    refetchInterval: 15_000,
    queryFn: async () => {
      let q = supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      q = tab === "groups" ? q.not("group_id", "is", null) : q.is("group_id", null);
      if (filter === "pending")
        q = q.eq("status", "pending").or("channel.is.null,channel.neq.ACCESS_PIN");
      const { data, error } = await q;
      if (error) throw error;
      const names = await namesFor((data ?? []).map((p) => p.user_id));
      return (data ?? []).map((p) => ({ ...p, who: names.get(p.user_id) ?? "" }));
    },
  });

  const groupPays = useQuery({
    queryKey: ["admin-group-payments", filter],
    enabled: tab === "groups",
    refetchInterval: 15_000,
    queryFn: async () => {
      let q = supabase
        .from("group_memberships")
        .select("*, group:groups(name)")
        .gt("amount", 0)
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "pending") q = q.eq("status", "pending");
      const { data, error } = await q;
      if (error) throw error;
      const names = await namesFor((data ?? []).map((p) => p.user_id));
      return (data ?? []).map((p) => ({ ...p, who: names.get(p.user_id) ?? "" }));
    },
  });

  async function decidePackage(id: string, approve: boolean) {
    setBusyId(id);
    const { error } = await supabase.rpc("confirm_payment", { _payment_id: id, _approve: approve });
    setBusyId(null);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success(
      approve ? "Malipo yamethibitishwa — alicholipia mteja kimefunguka" : "Malipo yamekataliwa",
    );
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-group-payments"] });
  }
  async function decideGroup(id: string, approve: boolean) {
    setBusyId(id);
    const { error } = await supabase.rpc("confirm_group_payment", {
      _membership_id: id,
      _approve: approve,
    });
    setBusyId(null);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success(approve ? "Mwanachama amethibitishwa — link imefunguka" : "Ombi limekataliwa");
    qc.invalidateQueries({ queryKey: ["admin-group-payments"] });
  }

  async function reopen(id: string, wasPaid: boolean) {
    if (
      !confirm(
        wasPaid
          ? "Rudisha malipo haya kwenye 'Yanasubiri'? Siku alizopewa mteja kwa malipo haya zitaondolewa."
          : "Rudisha malipo haya kwenye 'Yanasubiri' ili uyaamue upya?",
      )
    )
      return;
    setBusyId(id);
    const { error } = await supabase.rpc("admin_reopen_payment", { _payment_id: id });
    setBusyId(null);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Malipo yamerudishwa kwenye yanasubiri");
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }
  async function removePayment(table: "payments" | "group_memberships", id: string) {
    if (!confirm("Futa rekodi hii ya malipo kabisa?")) return;
    setBusyId(id);
    const { error } = await supabase.from(table).delete().eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Imefutwa");
    qc.invalidateQueries({
      queryKey: [table === "payments" ? "admin-payments" : "admin-group-payments"],
    });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  const tabCls = (on: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-semibold",
      on ? "bg-gradient-blue text-primary-foreground" : "text-muted-foreground",
    );
  const list = tab === "packages" ? pkgPays : groupPays;

  return (
    <div className="max-w-4xl">
      <AdminTitle sub="Mteja akishalipa kwa M-Pesa, bonyeza Kubali ili video zake zifunguke. Ukikosea, bonyeza Rudisha.">
        Malipo
      </AdminTitle>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-surface p-1">
          <button className={tabCls(tab === "packages")} onClick={() => setTab("packages")}>
            Vifurushi
          </button>
          <button className={tabCls(tab === "groups")} onClick={() => setTab("groups")}>
            Magroup
          </button>
        </div>
        <div className="flex rounded-lg border border-border bg-surface p-1">
          <button className={tabCls(filter === "pending")} onClick={() => setFilter("pending")}>
            Yanasubiri
          </button>
          <button className={tabCls(filter === "all")} onClick={() => setFilter("all")}>
            Yote
          </button>
        </div>
      </div>

      {pkgPays.isLoading || list.isLoading ? (
        <Spinner />
      ) : !pkgPays.data?.length && !list.data?.length ? (
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title={filter === "pending" ? "Hakuna malipo yanayosubiri" : "Hakuna malipo bado"}
          body="Malipo mapya yataonekana hapa yenyewe."
        />
      ) : (
        <div className="space-y-2">
          {(pkgPays.data ?? []).map((p) => (
            <Panel key={p.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {p.who || "Mteja"} ·{" "}
                  <span className="text-muted-foreground">{formatPhone(p.phone)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.package_name} · {formatDateTime(p.created_at)}
                </p>
              </div>
              <p className="font-display text-2xl text-gold">{formatTSh(p.amount)}</p>
              <StatusPill status={p.status} />
              {p.status === "pending" ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="green"
                    disabled={busyId === p.id}
                    onClick={() => decidePackage(p.id, true)}
                  >
                    <Check /> Kubali
                  </Button>
                  <Button
                    size="sm"
                    variant="orange"
                    disabled={busyId === p.id}
                    onClick={() => decidePackage(p.id, false)}
                  >
                    <X /> Kataa
                  </Button>
                </div>
              ) : !p.group_id ? (
                <Button
                  size="sm"
                  variant="soft"
                  disabled={busyId === p.id}
                  onClick={() => reopen(p.id, p.status === "paid")}
                >
                  <RotateCcw /> Rudisha
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                disabled={busyId === p.id}
                onClick={() => removePayment("payments", p.id)}
                aria-label="Futa"
              >
                <Trash2 />
              </Button>
            </Panel>
          ))}
          {tab === "groups"
            ? (groupPays.data ?? []).map((m) => (
                <Panel key={m.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {m.who || "Mteja"} ·{" "}
                      <span className="text-muted-foreground">{formatPhone(m.phone)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(m.group as { name: string } | null)?.name ?? "Group"} ·{" "}
                      {formatDateTime(m.created_at)}
                    </p>
                  </div>
                  <p className="font-display text-2xl text-gold">{formatTSh(m.amount)}</p>
                  <StatusPill status={m.status} />
                  {m.status === "pending" ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="green"
                        disabled={busyId === m.id}
                        onClick={() => decideGroup(m.id, true)}
                      >
                        <Check /> Kubali
                      </Button>
                      <Button
                        size="sm"
                        variant="orange"
                        disabled={busyId === m.id}
                        onClick={() => decideGroup(m.id, false)}
                      >
                        <X /> Kataa
                      </Button>
                    </div>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busyId === m.id}
                    onClick={() => removePayment("group_memberships", m.id)}
                    aria-label="Futa"
                  >
                    <Trash2 />
                  </Button>
                </Panel>
              ))
            : null}
        </div>
      )}
    </div>
  );
}
