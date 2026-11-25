import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AdminTitle, FieldRow, Panel } from "@/components/admin/admin-ui";
import { readPaymentConfig, savePaymentConfig } from "@/lib/payment-config.functions";
import { testPaymentKey } from "@/lib/sonicpesa.functions";
import { errorMessage, qk, useSettings } from "@/lib/queries";
import { readContent } from "@/lib/site-content";

export const Route = createFileRoute("/admin/connection")({
  head: () => ({
    meta: [
      { title: "Unganisha Malipo — TRANDING VIDEO" },
      { name: "description", content: "Mipangilio ya malipo ya SonicPesa na malipo ya manual." },
      { property: "og:title", content: "Unganisha Malipo — TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Mipangilio ya malipo ya SonicPesa na malipo ya manual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Connection,
});

function SecretField({
  label,
  value,
  onChange,
  configured,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  configured: boolean;
  icon: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          {icon}
          {label}
        </span>
        <span
          className={configured ? "flex items-center gap-1 text-success" : "text-muted-foreground"}
        >
          {configured ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Imewekwa · ••••••••
            </>
          ) : (
            "Bado haijawekwa"
          )}
        </span>
      </div>
      <div className="relative">
        <Input
          aria-label={label}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={configured ? "Weka mpya tu ukitaka kubadilisha" : `Weka ${label}`}
          className="h-11 pr-11"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-9 w-9"
          aria-label={visible ? `Ficha ${label}` : `Onyesha ${label}`}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </div>
  );
}

function Connection() {
  const read = useServerFn(readPaymentConfig);
  const save = useServerFn(savePaymentConfig);
  const test = useServerFn(testPaymentKey);
  const qc = useQueryClient();
  const settings = useSettings();
  const cfg = useQuery({ queryKey: ["payment-config-status"], queryFn: () => read() });

  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const [manualNumber, setManualNumber] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualBusy, setManualBusy] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    const c = readContent(settings.data.content);
    setManualNumber(c.manual_payment_number);
    setManualName(c.manual_payment_name);
  }, [settings.data]);

  const complete = !!(key || cfg.data?.keyConfigured) && !!(secret || cfg.data?.secretConfigured);

  async function submit() {
    if (!complete) {
      toast.error("Weka API key na API secret zote mbili");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: { apiKey: key, apiSecret: secret, enabled: enabled ?? cfg.data?.enabled ?? false },
      });
      setKey("");
      setSecret("");
      await qc.invalidateQueries({ queryKey: ["payment-config-status"] });
      toast.success("Funguo za SonicPesa zimehifadhiwa");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveManual() {
    if (!manualNumber.trim() || !manualName.trim()) {
      toast.error("Weka namba ya malipo na jina la hiyo namba");
      return;
    }
    setManualBusy(true);
    try {
      const current = readContent(settings.data?.content);
      const nextContent = {
        ...current,
        manual_payment_number: manualNumber.trim(),
        manual_payment_name: manualName.trim(),
      } as unknown as Json;
      const { error } = await supabase
        .from("site_settings")
        .update({ content: nextContent })
        .eq("id", 1);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Taarifa za malipo ya manual zimehifadhiwa");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setManualBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <AdminTitle>Unganisha Malipo</AdminTitle>

      <Panel className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-gold" />
          <div>
            <h2 className="font-bold">Malipo ya Manual (Namba &amp; Jina)</h2>
            <p className="text-xs text-muted-foreground">
              Mteja akichagua "Lipia kwa Manual", ataona namba hii na jina hili la kutuma pesa kabla
              ya kuomba Access PIN WhatsApp.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="Namba ya malipo">
            <Input
              aria-label="Namba ya malipo ya manual"
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              placeholder="Mf. 0754 123 456"
            />
          </FieldRow>
          <FieldRow label="Jina la namba">
            <Input
              aria-label="Jina la namba ya manual"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Mf. JUMA HASSAN"
            />
          </FieldRow>
        </div>
        <Button variant="green" disabled={manualBusy} onClick={saveManual}>
          <Save /> Hifadhi Malipo ya Manual
        </Button>
      </Panel>

      <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <div className="rounded-lg border border-blue/30 bg-background/60 p-3">
          <p className="font-semibold">SonicPesa (Lipia kwa Automatik)</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Weka funguo zote mbili. Baada ya kuhifadhi, thamani zake hazionyeshwi tena kwa usalama;
            utaona tu hali ya kuwekwa.
          </p>
        </div>
        {cfg.isError ? <p className="text-destructive">{errorMessage(cfg.error)}</p> : null}
        <FieldRow label="Funguo za SonicPesa">
          <div className="space-y-4">
            <SecretField
              label="API key"
              value={key}
              onChange={setKey}
              configured={cfg.data?.keyConfigured ?? false}
              icon={<KeyRound className="h-4 w-4 text-blue-glow" />}
            />
            <SecretField
              label="API secret"
              value={secret}
              onChange={setSecret}
              configured={cfg.data?.secretConfigured ?? false}
              icon={<LockKeyhole className="h-4 w-4 text-purple" />}
            />
          </div>
        </FieldRow>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3 text-sm">
          Washa malipo kwa simu (Automatik)
          <Switch checked={enabled ?? cfg.data?.enabled ?? false} onCheckedChange={setEnabled} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="green" disabled={busy || cfg.isError || !complete} onClick={submit}>
            <Save /> Hifadhi Funguo
          </Button>
          <Button
            variant="blue"
            disabled={busy || !cfg.data?.configured}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await test();
                if (r.ok) toast.success(r.message);
                else toast.error(r.message);
              } catch {
                toast.error("Imeshindikana kupima muunganisho");
              } finally {
                setBusy(false);
              }
            }}
          >
            <ShieldCheck /> Jaribu Muunganisho
          </Button>
        </div>
      </div>
    </div>
  );
}
