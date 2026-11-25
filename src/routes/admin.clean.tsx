import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AdminTitle } from "@/components/admin/admin-ui";
import { errorMessage } from "@/lib/queries";
import { AccountCleanup } from "@/components/admin/account-cleanup";
const OPTIONS = [
  {
    id: "failed_payments",
    title: "Malipo yaliyoshindikana",
    description: "Malipo yaliyofanikiwa na yanayosubiri hayatafutwa.",
  },
  {
    id: "watch_history",
    title: "Historia ya watumiaji",
    description: "Futa kumbukumbu za walipoishia kutazama. Akaunti na vifurushi vinabaki.",
  },
  {
    id: "visits",
    title: "Historia ya wageni",
    description: "Futa historia ya matembezi. Takwimu za wageni zitaanza upya.",
  },
] as const;
export const Route = createFileRoute("/admin/clean")({
  head: () => ({
    meta: [
      { title: "Usafishaji — TRANDING VIDEO" },
      { name: "description", content: "Safisha kumbukumbu zilizochaguliwa kwa uthibitisho." },
      { property: "og:title", content: "Usafishaji — TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Safisha kumbukumbu zilizochaguliwa kwa uthibitisho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clean,
});
function Clean() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<(typeof OPTIONS)[number] | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  async function clean() {
    if (!selected || confirmation !== "FUTA") return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_clean_data", {
        _scope: selected.id,
        _confirmation: confirmation,
      });
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success(`Kumbukumbu ${data} zimefutwa`);
      setSelected(null);
      setConfirmation("");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-3xl">
      <AdminTitle>Usafishaji</AdminTitle>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-5">
        <div>
          <h2 className="font-bold">Onyesha taarifa mpya</h2>
          <p className="text-sm text-muted-foreground">
            Safisha cache ya ukurasa huu bila kufuta akaunti au malipo.
          </p>
        </div>
        <Button
          variant="blue"
          onClick={async () => {
            await qc.cancelQueries();
            qc.removeQueries({ type: "inactive" });
            await qc.resetQueries({ type: "active" });
            if ("caches" in window) {
              for (const key of await caches.keys()) await caches.delete(key);
            }
            toast.success("Taarifa zimeonyeshwa upya");
          }}
        >
          <RefreshCw /> Safisha Cache
        </Button>
      </div>
      <AccountCleanup />
      {OPTIONS.map((option) => (
        <div
          key={option.id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-5"
        >
          <div className="min-w-0">
            <h2 className="font-bold">{option.title}</h2>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </div>
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              setSelected(option);
              setConfirmation("");
            }}
          >
            <Trash2 /> Futa
          </Button>
        </div>
      ))}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Futa {selected?.title.toLowerCase()}?</DialogTitle>
          <DialogDescription>
            {selected?.description} Huwezi kurudisha kumbukumbu hizi. Andika FUTA kuthibitisha.
          </DialogDescription>
          <Input
            aria-label="Uthibitisho wa kufuta"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setSelected(null)}>
              Rudi
            </Button>
            <Button
              variant="destructive"
              disabled={busy || confirmation !== "FUTA"}
              onClick={clean}
            >
              <Trash2 /> Thibitisha Kufuta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
