import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminTitle, FieldRow, Panel } from "@/components/admin/admin-ui";
import { Spinner } from "@/components/app/states";
import { errorMessage, qk } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Arifa — Admin TRANDING VIDEO" },
      { name: "description", content: "Tuma arifa kwa watumiaji wote." },
      { property: "og:title", content: "Arifa — Admin TRANDING VIDEO" },
      { property: "og:description", content: "Tuma arifa kwa watumiaji wote." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminNotifications,
});

function AdminNotifications() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    qc.invalidateQueries({ queryKey: qk.notifications });
  };
  async function send() {
    if (!title.trim()) {
      toast.error("Weka kichwa cha arifa");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("notifications")
      .insert({ title: title.trim(), body: body.trim(), kind: "info" });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    setTitle("");
    setBody("");
    toast.success("Arifa imetumwa kwa wote");
    refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    refresh();
  }
  return (
    <div className="max-w-2xl">
      <AdminTitle sub="Video na vipindi vipya vinatuma arifa vyenyewe">Arifa</AdminTitle>
      <Panel className="mb-5 space-y-3 p-4">
        <FieldRow label="Kichwa">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mf. Ofa ya wikendi!"
          />
        </FieldRow>
        <FieldRow label="Ujumbe">
          <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </FieldRow>
        <Button variant="hero" onClick={send} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4 text-primary-foreground" /> : <Send />} Tuma kwa Wote
        </Button>
      </Panel>
      {list.isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {(list.data ?? []).map((n) => (
            <Panel key={n.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{n.title}</p>
                {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDateTime(n.created_at)}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => remove(n.id)}
                aria-label="Futa arifa"
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
