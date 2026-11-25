import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Bookmark,
  Camera,
  ChevronRight,
  Crown,
  Gift,
  History,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Receipt,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageContainer } from "@/components/app/app-shell";
import { CountdownBlocks } from "@/components/app/countdown";
import { usePaywall } from "@/components/app/paywall";
import { Spinner } from "@/components/app/states";
import { ShareInvite } from "@/components/app/share-invite";
import { useAuth } from "@/hooks/use-auth";
import {
  errorMessage,
  qk,
  useCatalog,
  useProfile,
  useProgress,
  useSettings,
  useSubscription,
} from "@/lib/queries";
import { formatDateTime, formatTSh } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { StatusPill } from "@/components/app/status-pill";
import { SupportLinks } from "@/components/app/support-links";
import { PWAInstallButton } from "@/components/app/pwa-prompt";
import { useText } from "@/lib/site-text";
import { filterVisiblePaymentHistory } from "@/lib/experience-rules";

export const Route = createFileRoute("/_authenticated/_shell/profile")({
  head: () => ({
    meta: [
      { title: "Profile — TRANDING VIDEO" },
      { name: "description", content: "Akaunti yako, kifurushi, historia ya kutazama na malipo." },
      { property: "og:title", content: "Profile — TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Akaunti yako, kifurushi, historia ya kutazama na malipo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useProfile();
  const sub = useSubscription();
  const settings = useSettings();
  const t = useText();
  const paywall = usePaywall();
  const progress = useProgress();
  const catalog = useCatalog();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const payments = useQuery({
    queryKey: ["payments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const referrals = useQuery({
    queryKey: ["referrals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const p = profile.data;
  const byId = new Map((catalog.data ?? []).map((v) => [v.id, v]));

  async function updatePref(
    field: "notify_new_videos" | "notify_new_episodes" | "notify_expiry",
    value: boolean,
  ) {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value } as { notify_new_videos?: boolean })
      .eq("id", userId);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    qc.invalidateQueries({ queryKey: qk.profile(userId) });
  }

  async function uploadAvatar(file: File) {
    if (!userId) return;
    setUploading(true);
    try {
      const path = `avatars/${userId}/${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
      const { error } = await supabase.storage
        .from("media")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data, error: e2 } = await supabase.storage
        .from("media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (e2 || !data) throw e2;
      await supabase.from("profiles").update({ avatar_url: data.signedUrl }).eq("id", userId);
      qc.invalidateQueries({ queryKey: qk.profile(userId) });
      toast.success("Picha imebadilishwa");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function updatePassword() {
    if (newPassword.length < 6) {
      toast.error("Nenosiri jipya liwe na herufi 6 au zaidi");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Nenosiri hazifanani");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(errorMessage(error));
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Nenosiri limebadilishwa");
    } finally {
      setPwBusy(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const visiblePayments = filterVisiblePaymentHistory(payments.data ?? []);

  const inviteLink =
    typeof window !== "undefined" && p?.referral_code
      ? `${window.location.origin}/auth?ref=${p.referral_code}`
      : "";

  if (profile.isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-20">
          <Spinner className="h-10 w-10" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-3xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gradient-primary ring-2 ring-primary/40"
          aria-label="Badilisha picha"
        >
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-4xl">
              {(p?.full_name || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-scrim">
            {uploading ? <Spinner className="h-3 w-3" /> : <Camera className="h-3.5 w-3.5" />}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{p?.full_name || "Mtumiaji"}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> {formatPhone(p?.phone)}
          </p>
          {sub.isAdmin ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
              <Shield className="h-3 w-3" /> Admin
            </span>
          ) : null}
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-gold/30 bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Crown className="h-5 w-5 text-gold" />
          <p className="font-bold">Kifurushi Changu</p>
        </div>
        <div className="p-5">
          {sub.expiresAt ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Muda uliobaki kabla kifurushi hakijaisha
              </p>
              <CountdownBlocks expiresAt={sub.expiresAt} />
              <p className="mt-3 text-xs text-muted-foreground">
                Kinaisha: {formatDateTime(sub.expiresAt)}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => paywall.open()}>
                Ongeza Muda
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {sub.isAdmin
                  ? "Kama admin, unaweza kutazama video zote."
                  : "Huna kifurushi kinachotumika. Video zimefungwa."}
              </p>
              {!sub.isAdmin ? (
                <Button variant="hero" className="mt-4" onClick={() => paywall.open()}>
                  Lipia Hapa Kutazama
                </Button>
              ) : null}
            </>
          )}
        </div>
      </section>

      {sub.isAdmin ? (
        <Link
          to="/admin"
          className="mt-4 flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-5 py-4 font-semibold"
        >
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Fungua Admin Panel
          </span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}

      <Accordion
        type="multiple"
        className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface"
      >
        <Link
          to="/orodha"
          className="flex items-center justify-between border-b border-border px-5 py-4 text-sm font-semibold hover:bg-accent"
        >
          <span className="flex items-center gap-3">
            <Bookmark className="h-5 w-5 text-muted-foreground" /> Orodha Yangu
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Section
          value="history"
          icon={<History className="h-5 w-5" />}
          title="Historia ya Kutazama"
        >
          {(progress.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Bado hujatazama video yoyote.</p>
          ) : (
            <ul className="space-y-2">
              {(progress.data ?? []).slice(0, 20).map((r) => {
                const v = byId.get(r.video_id);
                if (!v) return null;
                const pct = r.duration_seconds
                  ? Math.round((r.position_seconds / r.duration_seconds) * 100)
                  : 0;
                return (
                  <li key={r.id}>
                    <Link
                      to="/video/$videoId"
                      params={{ videoId: v.id }}
                      className="flex items-center gap-3 rounded-lg p-1 hover:bg-accent"
                    >
                      {v.thumbnail_url ? (
                        <img
                          src={v.thumbnail_url}
                          alt=""
                          className="h-14 w-10 rounded object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{v.title}</p>
                        <div className="mt-1 h-1 w-full rounded bg-foreground/15">
                          <div className="h-full rounded bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(r.updated_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section value="payments" icon={<Receipt className="h-5 w-5" />} title="Historia ya Malipo">
          {payments.isLoading ? (
            <Spinner />
          ) : visiblePayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hakuna malipo bado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visiblePayments.map((pm) => (
                <li key={pm.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-semibold">{pm.package_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(pm.created_at)} · {pm.reference}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatTSh(pm.amount)}</p>
                    <StatusPill status={pm.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          value="invite"
          icon={<Gift className="h-5 w-5" />}
          title="Mwaliko wa Rafiki (Promo Code)"
        >
          <p className="text-sm text-muted-foreground">
            Mwalike rafiki kwa Promo Code yako: akijiunga anapata{" "}
            <strong className="text-success">dakika 20 bure</strong> kutazama, na akinunua kifurushi
            chake cha kwanza unapata{" "}
            <strong className="text-gold">
              siku {Math.max(1, settings.data?.referral_reward_days ?? 1)} za bure
            </strong>{" "}
            moja kwa moja.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-gold/50 bg-gold/5 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Promo Code yako</p>
              <p className="font-display text-3xl tracking-widest text-gold">{p?.referral_code}</p>
            </div>
          </div>
          <div className="mt-4">
            <ShareInvite
              link={inviteLink}
              siteName={settings.data?.site_name || "TRANDING VIDEO"}
              code={p?.referral_code ?? ""}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Marafiki waliojiunga: {referrals.data?.length ?? 0} · Waliolipia:{" "}
            {referrals.data?.filter((r) => r.rewarded).length ?? 0}
          </p>
        </Section>

        <Section
          value="password"
          icon={<Lock className="h-5 w-5" />}
          title="Badili Nenosiri (Password)"
        >
          <div className="space-y-3">
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nenosiri jipya (angalau herufi 6)"
              className="h-11"
            />
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Rudia nenosiri jipya"
              className="h-11"
            />
            <Button variant="blue" onClick={updatePassword} disabled={pwBusy}>
              {pwBusy ? <Spinner className="h-4 w-4 text-primary-foreground" /> : <Lock />} Hifadhi
              Nenosiri Jipya
            </Button>
          </div>
        </Section>

        <Section value="notify" icon={<Bell className="h-5 w-5" />} title="Arifa">
          <div className="space-y-3">
            <Pref
              label="Video mpya"
              checked={!!p?.notify_new_videos}
              onChange={(v) => updatePref("notify_new_videos", v)}
            />
            <Pref
              label="Vipindi vipya vya tamthilia"
              checked={!!p?.notify_new_episodes}
              onChange={(v) => updatePref("notify_new_episodes", v)}
            />
            <Pref
              label="Kifurushi kinakaribia kuisha"
              checked={!!p?.notify_expiry}
              onChange={(v) => updatePref("notify_expiry", v)}
            />
          </div>
        </Section>

        <Section value="help" icon={<LifeBuoy className="h-5 w-5" />} title={t("support.title")}>
          <SupportLinks />
        </Section>
      </Accordion>

      <div className="mt-6 space-y-3">
        <PWAInstallButton fullWidth />
        <Button
          variant="outline"
          size="lg"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut /> Toka
        </Button>
      </div>
    </PageContainer>
  );
}

function Section({
  value,
  icon,
  title,
  children,
}: {
  value: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-b border-border last:border-b-0">
      <AccordionTrigger className="px-5 py-4 text-sm font-semibold hover:no-underline">
        <span className="flex items-center gap-3">
          <span className="text-muted-foreground">{icon}</span> {title}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5">{children}</AccordionContent>
    </AccordionItem>
  );
}

function Pref({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
