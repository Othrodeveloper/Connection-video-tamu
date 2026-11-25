import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage } from "@/lib/queries";
import { deleteRegisteredAccount } from "@/lib/account-cleanup.functions";

export function AccountCleanup() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const remove = useServerFn(deleteRegisteredAccount);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const users = useQuery({
    queryKey: ["cleanup-users"],
    queryFn: async () => {
      const [profiles, staff] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone").order("created_at"),
        supabase.rpc("admin_list_staff"),
      ]);
      if (profiles.error) throw profiles.error;
      if (staff.error) throw staff.error;
      const protectedIds = new Set((staff.data ?? []).map((s) => s.user_id));
      return (profiles.data ?? []).filter((p) => p.id !== userId && !protectedIds.has(p.id));
    },
  });
  const rows = (users.data ?? []).filter((p) =>
    `${p.full_name} ${p.phone}`.toLowerCase().includes(search.toLowerCase()),
  );
  async function erase() {
    if (confirmation !== "FUTA AKAUNTI" || busy) return;
    setBusy(true);
    let count = 0;
    for (const id of selected) {
      try {
        await remove({ data: { userId: id, confirmation: "FUTA AKAUNTI" } });
        count++;
      } catch (e) {
        toast.error(errorMessage(e));
        break;
      }
    }
    setBusy(false);
    if (count) {
      toast.success(`Akaunti ${count} zimefutwa`);
      setSelected(selected.slice(count));
      await qc.invalidateQueries();
    }
    setOpen(false);
  }
  return (
    <section className="space-y-4 border-b border-border py-6">
      <h2 className="font-bold">Futa akaunti za watumiaji</h2>
      <p className="text-sm text-muted-foreground">
        Watumiaji waliofutwa watajisajili upya. Akaunti usizochagua zitabaki na wataingia kama
        kawaida. Kumbukumbu za malipo zitabaki bila namba zao za simu.
      </p>
      <Input
        aria-label="Tafuta akaunti ya kufuta"
        placeholder="Tafuta jina au namba"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {users.isError ? (
        <p className="text-sm text-destructive">
          Taarifa hazijafunguka.{" "}
          <Button variant="ghost" onClick={() => users.refetch()}>
            Jaribu tena
          </Button>
        </p>
      ) : null}
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={rows.length > 0 && rows.every((p) => selected.includes(p.id))}
          onChange={(e) =>
            setSelected(
              e.target.checked
                ? [...new Set([...selected, ...rows.map((p) => p.id)])]
                : selected.filter((id) => !rows.some((p) => p.id === id)),
            )
          }
        />{" "}
        Chagua wote wanaoonekana ({rows.length})
      </label>
      <div className="max-h-72 overflow-y-auto">
        {rows.map((p) => (
          <label key={p.id} className="flex items-center gap-3 border-b border-border py-3">
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id),
                )
              }
            />
            <span className="min-w-0 text-sm">
              <strong className="block break-words">{p.full_name}</strong>
              <span className="text-muted-foreground">{p.phone}</span>
            </span>
          </label>
        ))}
      </div>
      <Button
        variant="destructive"
        disabled={!selected.length}
        onClick={() => {
          setOpen(true);
          setConfirmation("");
        }}
      >
        <Trash2 /> Futa Akaunti ({selected.length})
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent>
          <DialogTitle>Futa akaunti {selected.length}?</DialogTitle>
          <DialogDescription>
            Taarifa zao, vifurushi na historia vitaondolewa. Watahitaji kujisajili upya. Huwezi
            kurudisha taarifa hizi. Andika FUTA AKAUNTI kuthibitisha.
          </DialogDescription>
          <Input
            aria-label="Thibitisha kufuta akaunti"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Rudi
            </Button>
            <Button
              variant="destructive"
              disabled={busy || confirmation !== "FUTA AKAUNTI"}
              onClick={erase}
            >
              <Trash2 /> {busy ? "Inafuta…" : "Thibitisha Kufuta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
