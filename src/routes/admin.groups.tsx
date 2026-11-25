import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AdminTitle,
  FieldRow,
  Panel,
  Toggle,
  UploadField,
  selectCls,
} from "@/components/admin/admin-ui";
import { EmptyState, Spinner } from "@/components/app/states";
import { errorMessage, qk, type Group } from "@/lib/queries";
import { formatTSh } from "@/lib/format";
import { uploadMedia } from "@/lib/media";
import { AdminGroupSlides } from "@/components/app/group-slides";

export const Route = createFileRoute("/admin/groups")({
  head: () => ({
    meta: [
      { title: "Magroup — Admin TRANDING VIDEO" },
      { name: "description", content: "Ongeza, hariri na futa magroup na kategoria zake." },
      { property: "og:title", content: "Magroup — Admin TRANDING VIDEO" },
      { property: "og:description", content: "Ongeza, hariri na futa magroup na kategoria zake." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminGroups,
});

type Row = Group & { link: string };

function useAdminGroups() {
  return useQuery({
    queryKey: ["admin-groups"],
    queryFn: async () => {
      const [g, l] = await Promise.all([
        supabase.from("groups").select("*").order("sort"),
        supabase.from("group_links").select("*"),
      ]);
      if (g.error) throw g.error;
      if (l.error) throw l.error;
      const links = new Map((l.data ?? []).map((r) => [r.group_id, r.join_link]));
      return (g.data ?? []).map((x) => ({ ...x, link: links.get(x.id) ?? "" })) as Row[];
    },
  });
}

function AdminGroups() {
  const qc = useQueryClient();
  const groups = useAdminGroups();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-groups"] });
    qc.invalidateQueries({ queryKey: qk.groups });
  };
  const categories = [...new Set((groups.data ?? []).map((g) => g.category))];

  async function remove(g: Row) {
    if (!confirm(`Futa group "${g.name}"? Wanachama wake wataondolewa pia.`)) return;
    await supabase.from("group_links").delete().eq("group_id", g.id);
    await supabase.from("group_memberships").delete().eq("group_id", g.id);
    const { error } = await supabase.from("groups").delete().eq("id", g.id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Group limefutwa");
    refresh();
  }

  return (
    <div>
      <AdminTitle
        sub="Kadi za magroup zinazoonekana kwa watumiaji"
        action={
          <Button variant="hero" onClick={() => setEditing("new")}>
            <Plus /> Group Jipya
          </Button>
        }
      >
        Magroup
      </AdminTitle>

      <AdminGroupSlides />
      <GroupCategories categories={categories} onDone={refresh} />

      {groups.isLoading ? (
        <Spinner />
      ) : !groups.data?.length ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Hakuna magroup"
          body="Bonyeza Group Jipya kuongeza."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.data.map((g) => (
            <Panel key={g.id} className={`overflow-hidden ${g.is_active ? "" : "opacity-60"}`}>
              <div className="aspect-[16/9] bg-surface-2">
                {g.image_url ? (
                  <img
                    src={g.image_url}
                    alt={g.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.category} · {g.members_count} wanachama ·{" "}
                      {g.is_paid ? formatTSh(g.price) : "Bure"}
                      {g.is_active ? "" : " · Limezimwa"}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(g)}
                      aria-label="Hariri"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => remove(g)}
                      aria-label="Futa"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                {!g.link ? (
                  <p className="mt-1 text-[11px] font-semibold text-gold">
                    Link ya kujiunga haijawekwa
                  </p>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      )}
      <GroupDialog
        value={editing}
        categories={categories}
        onClose={(changed) => {
          setEditing(null);
          if (changed) refresh();
        }}
      />
    </div>
  );
}

function GroupCategories({ categories, onDone }: { categories: string[]; onDone: () => void }) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  async function rename(oldName: string) {
    const v = edits[oldName]?.trim();
    if (!v || v === oldName) return;
    const { error } = await supabase.from("groups").update({ category: v }).eq("category", oldName);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    setEdits((e) => {
      const n = { ...e };
      delete n[oldName];
      return n;
    });
    toast.success("Jina la kategoria limebadilishwa");
    onDone();
  }
  if (!categories.length) return null;
  return (
    <Panel className="mb-5 p-4">
      <p className="mb-1 text-sm font-bold">Kategoria za magroup</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Badilisha jina kisha bonyeza ✓. Magroup yote ya kategoria hiyo yatabadilika.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c} className="flex items-center gap-1">
            <Input
              value={edits[c] ?? c}
              onChange={(e) => setEdits((s) => ({ ...s, [c]: e.target.value }))}
              aria-label={`Jina la kategoria ${c}`}
            />
            {edits[c] !== undefined && edits[c] !== c ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => rename(c)}
                aria-label="Hifadhi jina"
              >
                <Check />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

const blank = {
  name: "",
  description: "",
  category: "",
  newCategory: "",
  image_url: "",
  members_count: "0",
  is_paid: false,
  price: "0",
  is_active: true,
  sort: "0",
  link: "",
};

function GroupDialog({
  value,
  categories,
  onClose,
}: {
  value: Row | "new" | null;
  categories: string[];
  onClose: (changed: boolean) => void;
}) {
  const [f, setF] = useState(blank);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const k = value === null ? null : value === "new" ? "new" : value.id;
  if (k !== key) {
    setKey(k);
    if (value && value !== "new")
      setF({
        name: value.name,
        description: value.description,
        category: value.category,
        newCategory: "",
        image_url: value.image_url ?? "",
        members_count: String(value.members_count),
        is_paid: value.is_paid,
        price: String(value.price),
        is_active: value.is_active,
        sort: String(value.sort),
        link: value.link,
      });
    else setF({ ...blank, category: categories[0] ?? "" });
  }
  const set = <K extends keyof typeof f>(k2: K, v: (typeof f)[K]) =>
    setF((s) => ({ ...s, [k2]: v }));

  async function save() {
    if (!f.name.trim()) {
      toast.error("Weka jina la group");
      return;
    }
    if (f.is_paid && Number(f.price) <= 0) {
      toast.error("Weka bei ya group zaidi ya sifuri");
      return;
    }
    const category = f.newCategory.trim() || f.category || "Nyinginezo";
    setBusy(true);
    try {
      const row = {
        name: f.name.trim(),
        description: f.description.trim(),
        category,
        image_url: f.image_url || null,
        members_count: Number(f.members_count) || 0,
        is_paid: f.is_paid,
        price: f.is_paid ? Number(f.price) || 0 : 0,
        is_active: f.is_active,
        sort: Number(f.sort) || 0,
      };
      const res =
        value && value !== "new"
          ? await supabase.from("groups").update(row).eq("id", value.id).select("id").single()
          : await supabase.from("groups").insert(row).select("id").single();
      if (res.error) throw res.error;
      const id = res.data.id;
      if (f.link.trim()) {
        const { error } = await supabase
          .from("group_links")
          .upsert({ group_id: id, join_link: f.link.trim() });
        if (error) throw error;
      } else {
        await supabase.from("group_links").delete().eq("group_id", id);
      }
      toast.success("Group limehifadhiwa");
      onClose(true);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogTitle className="font-display text-3xl">
          {value === "new" ? "Group Jipya" : "Hariri Group"}
        </DialogTitle>
        <FieldRow label="Jina la group (linaonekana chini ya kadi)">
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
        </FieldRow>
        <FieldRow label="Maelezo">
          <Textarea
            rows={2}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </FieldRow>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="Kategoria — chagua">
            <select
              className={selectCls}
              value={f.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {categories.length ? null : <option value="">Nyinginezo</option>}
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="…au andika kategoria mpya">
            <Input
              value={f.newCategory}
              onChange={(e) => set("newCategory", e.target.value)}
              placeholder="Mf. Michezo"
            />
          </FieldRow>
        </div>
        <UploadField
          label="Picha ya kadi"
          preview="image"
          accept="image/*"
          value={f.image_url}
          onChange={(v) => set("image_url", v)}
          upload={(file) => uploadMedia(file, "groups")}
        />
        <FieldRow
          label="Link ya kujiunga (WhatsApp/Telegram)"
          hint="Inaonekana tu kwa waliojiunga au waliolipia."
        >
          <Input
            value={f.link}
            onChange={(e) => set("link", e.target.value)}
            placeholder="https://chat.whatsapp.com/…"
          />
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Idadi ya wanachama">
            <Input
              inputMode="numeric"
              value={f.members_count}
              onChange={(e) => set("members_count", e.target.value.replace(/\D/g, ""))}
            />
          </FieldRow>
          <FieldRow label="Mpangilio">
            <Input
              inputMode="numeric"
              value={f.sort}
              onChange={(e) => set("sort", e.target.value.replace(/\D/g, ""))}
            />
          </FieldRow>
        </div>
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="space-y-2 pb-2">
            <Toggle label="Ni la kulipia" checked={f.is_paid} onChange={(v) => set("is_paid", v)} />
            <Toggle
              label="Linaonekana"
              checked={f.is_active}
              onChange={(v) => set("is_active", v)}
            />
          </div>
          {f.is_paid ? (
            <FieldRow label="Bei (TSh)">
              <Input
                inputMode="numeric"
                value={f.price}
                onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))}
              />
            </FieldRow>
          ) : (
            <div />
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose(false)}>
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
