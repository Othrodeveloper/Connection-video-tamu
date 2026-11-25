import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AdminTitle, FieldRow, Panel, Toggle } from "@/components/admin/admin-ui";
import { Spinner } from "@/components/app/states";
import { errorMessage, qk, type Package } from "@/lib/queries";
import { durationLabel, formatTSh } from "@/lib/format";

export const Route = createFileRoute("/admin/packages")({
  head: () => ({
    meta: [
      { title: "Vifurushi — Admin TRANDING VIDEO" },
      { name: "description", content: "Weka majina, bei na muda wa vifurushi." },
      { property: "og:title", content: "Vifurushi — Admin TRANDING VIDEO" },
      { property: "og:description", content: "Weka majina, bei na muda wa vifurushi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Packages,
});

function Packages() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Package | "new" | null>(null);
  const pkgs = useQuery({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packages").select("*").order("sort");
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    qc.invalidateQueries({ queryKey: qk.packages });
  };
  async function remove(p: Package) {
    if (
      !confirm(
        `Futa kifurushi "${p.name}"? Hakuna mtu atakayeweza kukinunua tena. Walioshalipia wataendelea na siku zao.`,
      )
    )
      return;
    const { error } = await supabase.from("packages").delete().eq("id", p.id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Kifurushi kimefutwa");
    refresh();
  }

  return (
    <div className="max-w-3xl">
      <AdminTitle
        sub="Vifurushi vinavyoonekana kwenye kidirisha cha malipo"
        action={
          <Button variant="green" onClick={() => setEditing("new")}>
            <Plus /> Kifurushi Kipya
          </Button>
        }
      >
        Vifurushi
      </AdminTitle>
      {pkgs.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(pkgs.data ?? []).map((p) => (
            <Panel key={p.id} className={`p-4 ${p.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {durationLabel(p.duration_days)} ({p.duration_days} siku)
                    {p.is_active ? "" : " · Kimezimwa"}
                  </p>
                </div>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(p)}
                    aria-label="Hariri"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => remove(p)}
                    aria-label="Futa"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <p className="mt-2 font-display text-3xl text-gold">{formatTSh(p.price)}</p>
              {p.description ? (
                <p className="text-xs text-muted-foreground">{p.description}</p>
              ) : null}
            </Panel>
          ))}
        </div>
      )}
      <PackageDialog
        value={editing}
        onClose={() => {
          setEditing(null);
          refresh();
        }}
      />
    </div>
  );
}

function PackageDialog({ value, onClose }: { value: Package | "new" | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    days: "7",
    price: "3000",
    description: "",
    active: true,
    sort: "0",
  });
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const k = value === null ? null : value === "new" ? "new" : value.id;
  if (k !== key) {
    setKey(k);
    if (value && value !== "new")
      setForm({
        name: value.name,
        days: String(value.duration_days),
        price: String(value.price),
        description: value.description,
        active: value.is_active,
        sort: String(value.sort),
      });
    else setForm({ name: "", days: "7", price: "3000", description: "", active: true, sort: "0" });
  }
  async function save() {
    if (!form.name.trim() || !Number(form.days)) {
      toast.error("Weka jina na idadi ya siku");
      return;
    }
    setBusy(true);
    const row = {
      name: form.name.trim(),
      duration_days: Number(form.days),
      price: Number(form.price) || 0,
      description: form.description.trim(),
      is_active: form.active,
      sort: Number(form.sort) || 0,
    };
    const { error } =
      value && value !== "new"
        ? await supabase.from("packages").update(row).eq("id", value.id)
        : await supabase.from("packages").insert(row);
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Kifurushi kimehifadhiwa");
    onClose();
  }
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle className="font-display text-3xl">
          {value === "new" ? "Kifurushi Kipya" : "Hariri Kifurushi"}
        </DialogTitle>
        <FieldRow label="Jina">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Mf. Wiki 1"
          />
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Muda (siku)" hint="1 = siku, 7 = wiki, 30 = mwezi">
            <Input
              inputMode="numeric"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value.replace(/\D/g, "") })}
            />
          </FieldRow>
          <FieldRow label="Bei (TSh)">
            <Input
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })}
            />
          </FieldRow>
        </div>
        <FieldRow label="Maelezo mafupi">
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </FieldRow>
        <div className="grid grid-cols-2 items-end gap-3">
          <FieldRow label="Mpangilio">
            <Input
              inputMode="numeric"
              value={form.sort}
              onChange={(e) => setForm({ ...form, sort: e.target.value.replace(/\D/g, "") })}
            />
          </FieldRow>
          <div className="pb-2">
            <Toggle
              label="Kinatumika"
              checked={form.active}
              onChange={(v) => setForm({ ...form, active: v })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Ghairi
          </Button>
          <Button variant="hero" onClick={save} disabled={busy}>
            {busy ? <Spinner className="h-4 w-4 text-primary-foreground" /> : null} Hifadhi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
