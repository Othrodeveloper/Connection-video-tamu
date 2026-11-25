import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AdminTitle, selectCls } from "@/components/admin/admin-ui";
import { ADMIN_SECTIONS } from "@/lib/admin-access";
import { errorMessage } from "@/lib/queries";
export const Route = createFileRoute("/admin/staff")({
  head: () => ({
    meta: [
      { title: "Maadmin — TRANDING VIDEO" },
      { name: "description", content: "Ongeza wasimamizi na uchague sehemu wanazoweza kusimamia." },
      { property: "og:title", content: "Maadmin — TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Ongeza wasimamizi na uchague sehemu wanazoweza kusimamia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Staff,
});
function Staff() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  const [selected, setSelected] = useState("");
  const [term, setTerm] = useState("");
  const [sections, setSections] = useState<string[]>(["videos"]);
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState(false);
  const staff = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_staff");
      if (error) throw error;
      return data;
    },
  });
  const users = useQuery({
    queryKey: ["staff-users", term],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, full_name, phone")
        .order("created_at", { ascending: false })
        .limit(100);
      const safe = term.replace(/[%_,()]/g, "");
      if (safe) q = q.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
  async function save() {
    if (!selected || (!full && !sections.length)) return;
    if (full && !confirm("Mpe ruhusa zote pamoja na malipo na usafishaji?")) return;
    setBusy(true);
    try {
      const { error } = full
        ? await supabase.rpc("admin_set_full_staff", { _user_id: selected })
        : await supabase.rpc("admin_set_staff", { _user_id: selected, _sections: sections });
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success("Ruhusa zimehifadhiwa");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-3xl space-y-5">
      <AdminTitle>Maadmin</AdminTitle>
      {staff.isError ? <p className="text-destructive">{errorMessage(staff.error)}</p> : null}
      <div className="space-y-3 border-b border-border pb-5">
        <Input
          aria-label="Tafuta msimamizi"
          placeholder="Tafuta jina au namba"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <select
          aria-label="Chagua mtumiaji"
          className={selectCls}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Chagua mtumiaji</option>
          {users.data
            ?.filter((u) => u.id !== userId)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} · {u.phone}
              </option>
            ))}
        </select>
        <label className="flex items-center gap-2">
          <Checkbox checked={full} onCheckedChange={(v) => setFull(v === true)} /> Ruhusa zote
        </label>
        {!full ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {ADMIN_SECTIONS.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={sections.includes(s.id)}
                  onCheckedChange={(v) =>
                    setSections((old) =>
                      v === true ? [...old, s.id] : old.filter((id) => id !== s.id),
                    )
                  }
                />
                {s.label}
              </label>
            ))}
          </div>
        ) : null}
        <Button
          variant="green"
          onClick={save}
          disabled={busy || !selected || (!full && !sections.length)}
        >
          <Save /> Hifadhi Ruhusa
        </Button>
      </div>
      {staff.data?.map((person) => (
        <div
          key={person.user_id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-bold">
              <Shield className="h-4 w-4 text-blue-glow" />
              {person.full_name || person.phone}
            </p>
            <p className="text-sm text-muted-foreground">
              {person.is_full
                ? "Ruhusa zote"
                : ADMIN_SECTIONS.filter((s) => person.sections?.includes(s.id))
                    .map((s) => s.label)
                    .join(", ")}
            </p>
          </div>
          {person.user_id !== userId ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelected(person.user_id);
                  setFull(person.is_full);
                  setSections(person.sections ?? []);
                }}
              >
                Hariri
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ondoa msimamizi"
                className="text-destructive"
                onClick={async () => {
                  if (!confirm("Ondoa ruhusa za msimamizi huyu?")) return;
                  const { error } = await supabase.rpc("admin_remove_staff", {
                    _user_id: person.user_id,
                  });
                  if (error) toast.error(errorMessage(error));
                  else {
                    await qc.invalidateQueries();
                    toast.success("Ruhusa zimeondolewa");
                  }
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
