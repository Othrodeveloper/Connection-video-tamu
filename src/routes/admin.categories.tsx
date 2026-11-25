import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { Spinner } from "@/components/app/states";
import { errorMessage, qk, useCategories } from "@/lib/queries";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({
    meta: [
      { title: "Kategoria — Admin TRANDING VIDEO" },
      { name: "description", content: "Simamia kategoria za video." },
      { property: "og:title", content: "Kategoria — Admin TRANDING VIDEO" },
      { property: "og:description", content: "Simamia kategoria za video." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Categories,
});

function Categories() {
  const qc = useQueryClient();
  const cats = useCategories();
  const [name, setName] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.categories });
    qc.invalidateQueries({ queryKey: qk.catalog });
  };

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase
      .from("categories")
      .insert({ name: name.trim(), sort: (cats.data?.length ?? 0) + 1 });
    if (error) {
      toast.error(
        /duplicate/.test(error.message) ? "Kategoria hii ipo tayari" : errorMessage(error),
      );
      return;
    }
    setName("");
    refresh();
  }
  async function rename(id: string) {
    const v = edits[id]?.trim();
    if (!v) return;
    const { error } = await supabase.from("categories").update({ name: v }).eq("id", id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    setEdits((e) => {
      const n = { ...e };
      delete n[id];
      return n;
    });
    toast.success("Imehifadhiwa");
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Futa kategoria hii? Video zake zitabaki bila kategoria.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    refresh();
  }

  return (
    <div className="max-w-2xl">
      <AdminTitle sub="Andika jina la kategoria mpya kisha bonyeza Ongeza">Kategoria</AdminTitle>
      <Panel className="mb-4 flex gap-2 p-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Mf. Biashara, Elimu, Action…"
        />
        <Button variant="hero" onClick={add}>
          <Plus /> Ongeza
        </Button>
      </Panel>
      {cats.isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {(cats.data ?? []).map((c) => (
            <Panel key={c.id} className="flex items-center gap-2 p-2">
              <Input
                value={edits[c.id] ?? c.name}
                onChange={(e) => setEdits((s) => ({ ...s, [c.id]: e.target.value }))}
                className="border-transparent bg-transparent"
                aria-label="Jina la kategoria"
              />
              {edits[c.id] !== undefined && edits[c.id] !== c.name ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => rename(c.id)}
                  aria-label="Hifadhi"
                >
                  <Check />
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => remove(c.id)}
                aria-label="Futa"
              >
                <Trash2 />
              </Button>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
