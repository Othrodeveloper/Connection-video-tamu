import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  KeyRound,
  Package,
  ShieldAlert,
  Sparkles,
  Tv,
  Users,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGroups, usePackages, useProfile, useSettings } from "@/lib/queries";
import { durationLabel, formatTSh } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Spinner } from "@/components/app/states";
import { cn } from "@/lib/utils";
import { LogoRings } from "@/components/app/brand";
import { useText } from "@/lib/site-text";
import { readContent } from "@/lib/site-content";
import { redeemAccessToken } from "@/lib/tokens.functions";
import {
  MANUAL_NOTICE_SECONDS,
  MANUAL_PAYMENT_WARNING,
  dailyManualNameColorClass,
  packageHighlights,
} from "@/lib/experience-rules";

interface OpenOptions {
  videoId?: string;
  episodeId?: string;
  groupId?: string;
}

interface PaywallCtx {
  open: (opts?: OpenOptions) => void;
}

const Ctx = createContext<PaywallCtx>({ open: () => {} });
export const usePaywall = () => useContext(Ctx);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [target, setTarget] = useState<OpenOptions>({});
  const open = useCallback((opts?: OpenOptions) => {
    setTarget(opts ?? {});
    setOpen(true);
  }, []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <PaymentModal open={isOpen} onOpenChange={setOpen} target={target} />
    </Ctx.Provider>
  );
}

type Stage = "form" | "done";

function StepHead({
  n,
  title,
  done,
  icon,
}: {
  n: number;
  title: string;
  done: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-primary-foreground",
          done ? "bg-gradient-green" : "bg-surface-2 text-muted-foreground",
        )}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={3.5} /> : n}
      </span>
      <p
        className={cn(
          "flex items-center gap-1.5 text-sm font-bold",
          done ? "text-success" : "text-foreground",
        )}
      >
        {icon} {title}
      </p>
    </div>
  );
}

function PaymentModal({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: OpenOptions;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const packages = usePackages();
  const groups = useGroups();
  const profile = useProfile();
  const settings = useSettings();
  const t = useText();
  const redeem = useServerFn(redeemAccessToken);

  const [step, setStep] = useState<1 | 2>(1);
  const [noticeSeconds, setNoticeSeconds] = useState(MANUAL_NOTICE_SECONDS);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setNoticeSeconds(MANUAL_NOTICE_SECONDS);
    setPinCode("");
    setStage("form");
  }, [open, target.groupId, target.videoId, target.episodeId]);

  useEffect(() => {
    if (!target.groupId && !packageId && packages.data?.length) {
      setPackageId(packages.data[0]?.id ?? null);
    }
  }, [packages.data, packageId, target.groupId]);

  // 4-second mandatory warning screen before displaying manual payment recipient details
  useEffect(() => {
    if (!open || stage !== "form" || step !== 2 || noticeSeconds <= 0) return;
    const timer = setTimeout(() => {
      setNoticeSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [open, stage, step, noticeSeconds]);

  const selectedGroup = groups.data?.find((g) => g.id === target.groupId);
  const pkg = target.groupId ? selectedGroup : packages.data?.find((p) => p.id === packageId);
  const content = readContent(settings.data?.content);

  // Strictly use support_whatsapp number as requested
  const supportWaDigits = (settings.data?.support_whatsapp ?? "").replace(/\D/g, "");
  const registeredPhone = formatPhone(profile.data?.phone) || "—";
  const waText = pkg
    ? `Habari Admin, nimelipia *${pkg.name}* (${formatTSh(pkg.price)}) kwa namba ya malipo ya manual.\nJina: ${profile.data?.full_name || "Mtumiaji"}\nNamba yangu ya akaunti: ${registeredPhone}\nNaomba Access PIN ya kufungua.`
    : "";
  const waHref = supportWaDigits
    ? `https://wa.me/${supportWaDigits}?text=${encodeURIComponent(waText)}`
    : null;

  // Daily rotating color for recipient account name (green -> white -> orange)
  const dailyNameTone = dailyManualNameColorClass();

  function goToManualStep() {
    if (!pkg) {
      toast.error("Chagua kifurushi kwanza");
      return;
    }
    setNoticeSeconds(MANUAL_NOTICE_SECONDS);
    setStep(2);
  }

  const unlock = useCallback(async () => {
    setStage("done");
    toast.success(
      target.groupId
        ? "Malipo yamekamilika! Group limefunguka."
        : "Malipo yamekamilika! Video zimefunguka.",
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["memberships"] }),
      qc.invalidateQueries({ queryKey: ["group-link"] }),
      qc.invalidateQueries({ queryKey: ["subscription"] }),
      qc.invalidateQueries({ queryKey: ["payments"] }),
      qc.invalidateQueries({ queryKey: ["files"] }),
    ]);
    setTimeout(() => {
      onOpenChange(false);
      setStage("form");
      setPinCode("");
      if (target.videoId) {
        navigate({
          to: "/tazama/$videoId",
          params: { videoId: target.videoId },
          search: target.episodeId ? { ep: target.episodeId } : {},
        });
      }
    }, 900);
  }, [qc, onOpenChange, navigate, target.videoId, target.episodeId, target.groupId]);

  async function submitManualPin() {
    if (!pkg) {
      toast.error("Chagua kifurushi kwanza");
      setStep(1);
      return;
    }
    const clean = pinCode.trim();
    if (clean.length < 4) {
      toast.error("Weka Access PIN uliyopewa na Admin");
      return;
    }
    setSubmitting(true);
    try {
      const r = await redeem({
        data: {
          code: clean,
          ...(target.groupId ? { groupId: target.groupId } : { packageId: pkg.id }),
        },
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      await unlock();
    } catch {
      toast.error("Imeshindikana kuhakiki Access PIN. Jaribu tena.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyManualNumber() {
    try {
      await navigator.clipboard.writeText(content.manual_payment_number);
      toast.success("Namba ya kutuma pesa imenakiliwa");
    } catch {
      toast.error("Imeshindikana kunakili");
    }
  }

  function handleOpenChange(value: boolean) {
    onOpenChange(value);
    if (!value) {
      setStep(1);
      setStage("form");
      setNoticeSeconds(MANUAL_NOTICE_SECONDS);
    }
  }

  const maxPkgId =
    packages.data?.reduce(
      (best, p) => (!best || p.duration_days > best.duration_days ? p : best),
      packages.data[0],
    )?.id ?? null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto border-blue/30 bg-background p-0 sm:max-w-md">
        <div className="relative overflow-hidden rounded-t-xl bg-gradient-primary px-5 pb-4 pt-5 text-center">
          <LogoRings className="mx-auto mb-1.5" size="h-11 w-11" />
          <DialogTitle className="flex items-center justify-center gap-2 font-display text-3xl leading-none text-primary-foreground">
            {target.groupId ? (
              <Users className="h-6 w-6 text-gold" />
            ) : (
              <Tv className="h-6 w-6 text-gold" />
            )}
            {target.groupId ? "LIPIA GROUP VIP" : "VIFURUSHI VYA TV PASS"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs font-medium text-primary-foreground/85">
            {target.groupId
              ? "Malipo ya moja kwa moja kwa Access PIN ya group."
              : "Chagua kifurushi chako cha burudani kisha fungua kwa Access PIN."}
          </DialogDescription>
        </div>

        <div className="px-4 pb-5">
          {stage === "form" ? (
            <div className="space-y-4 pt-4">
              <div
                className="flex items-center justify-center gap-2"
                aria-label={`Hatua ${step} kati ya 2`}
              >
                {[1, 2].map((number) => (
                  <span
                    key={number}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      number < step
                        ? "bg-success text-primary-foreground"
                        : number === step
                          ? "bg-blue text-primary-foreground"
                          : "bg-surface-2 text-muted-foreground",
                    )}
                  >
                    {number < step ? <Check className="h-4 w-4" /> : number}
                  </span>
                ))}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">
                  Hatua {step}/2 · {step === 1 ? "Chagua Kifurushi" : "Malipo & Access PIN"}
                </span>
              </div>

              {step === 1 ? (
                <section className="space-y-3">
                  <StepHead
                    n={1}
                    title={target.groupId ? "Group ulilochagua" : "Chagua kifurushi cha kutazama"}
                    done={!!pkg}
                    icon={<Package className="h-4 w-4" />}
                  />

                  {target.groupId ? (
                    <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-surface via-surface-2/60 to-background p-4 shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 rounded bg-gold/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold">
                            <Crown className="h-3 w-3" /> Group VIP
                          </span>
                          <h3 className="mt-1.5 text-lg font-extrabold text-foreground">
                            {selectedGroup?.name ?? "Group inapakiwa…"}
                          </h3>
                          {selectedGroup?.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {selectedGroup.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Bei
                          </p>
                          <p className="font-display text-2xl leading-none text-gold">
                            {formatTSh(selectedGroup?.price ?? 0)}
                          </p>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                          <span>Link ya moja kwa moja ya kujiunga na group</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                          <span>Inafunguka papo hapo kwa Access PIN ya akaunti yako</span>
                        </li>
                      </ul>
                    </div>
                  ) : packages.isLoading ? (
                    <Spinner />
                  ) : !packages.data?.length ? (
                    <p className="text-sm text-muted-foreground">Hakuna vifurushi kwa sasa.</p>
                  ) : (
                    <div className="grid gap-3" role="radiogroup" aria-label="Vifurushi">
                      {packages.data.map((p) => {
                        const active = p.id === packageId;
                        const isBest = p.id === maxPkgId && packages.data.length > 1;
                        const perks = packageHighlights(p);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setPackageId(p.id)}
                            className={cn(
                              "relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all",
                              active
                                ? "border-gold bg-gradient-to-br from-surface-2 via-surface to-background shadow-gold ring-1 ring-gold/40"
                                : "border-border bg-surface hover:border-blue/50 hover:bg-surface-2/60",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-display text-2xl leading-none tracking-wide text-foreground">
                                    {p.name}
                                  </span>
                                  {isBest ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-gold px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold-foreground">
                                      <Sparkles className="h-2.5 w-2.5" /> Thamani Zaidi
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs font-semibold text-blue-glow">
                                  {durationLabel(p.duration_days)}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="font-display text-2xl leading-none text-gold">
                                  {formatTSh(p.price)}
                                </p>
                                <span
                                  className={cn(
                                    "mt-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                                    active
                                      ? "border-gold bg-gold text-gold-foreground"
                                      : "border-border bg-background text-transparent",
                                  )}
                                >
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </span>
                              </div>
                            </div>

                            <ul className="mt-3 space-y-1.5 border-t border-border/80 pt-2.5">
                              {perks.map((line) => (
                                <li
                                  key={line}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <CheckCircle2
                                    className={cn(
                                      "h-3.5 w-3.5 shrink-0",
                                      active ? "text-success" : "text-blue-glow",
                                    )}
                                  />
                                  <span className="truncate">{line}</span>
                                </li>
                              ))}
                            </ul>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : null}

              {step === 2 ? (
                <section className="space-y-3">
                  {noticeSeconds > 0 ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-2xl border border-orange/50 bg-gradient-to-b from-orange/15 via-surface to-background p-5 text-center shadow-card"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange/20 text-orange ring-2 ring-orange/40">
                        <ShieldAlert className="h-7 w-7" />
                      </div>
                      <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-gold">
                        ILANI MUHIMU KABLA YA KULIPIA
                      </p>
                      <p className="mt-2.5 text-sm font-extrabold leading-relaxed tracking-wide text-foreground">
                        {MANUAL_PAYMENT_WARNING}
                      </p>
                      <div className="mt-4 space-y-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-gradient-orange transition-all duration-700"
                            style={{
                              width: `${((MANUAL_NOTICE_SECONDS - noticeSeconds) / MANUAL_NOTICE_SECONDS) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                          Inafungua namba ya malipo baada ya sekunde{" "}
                          <span className="font-extrabold text-orange">{noticeSeconds}</span>…
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <StepHead
                        n={2}
                        title="Tuma hela & jaza Access PIN"
                        done={pinCode.trim().length >= 4}
                        icon={<KeyRound className="h-4 w-4" />}
                      />

                      <div className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Umechagua</span>
                          <strong className="text-right text-foreground">{pkg?.name}</strong>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span className="text-muted-foreground">Kiasi cha Kutuma</span>
                          <strong className="text-sm text-gold">
                            {formatTSh(pkg?.price ?? 0)}
                          </strong>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-surface-2/80 via-surface to-background p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gold">
                          Tuma {formatTSh(pkg?.price ?? 0)} kwa namba hii:
                        </p>
                        <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-3">
                          <div className="min-w-0">
                            <p className="font-mono text-xl font-black tracking-wider text-foreground">
                              {content.manual_payment_number}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Jina:{" "}
                              <span
                                className={cn(
                                  "font-extrabold tracking-wide uppercase",
                                  dailyNameTone,
                                )}
                              >
                                {content.manual_payment_name}
                              </span>
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="blue"
                            onClick={copyManualNumber}
                            aria-label="Nakili namba ya malipo"
                            className="shrink-0"
                          >
                            <Copy className="h-3.5 w-3.5" /> Nakili
                          </Button>
                        </div>

                        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-orange/10 px-2.5 py-2 text-[11px] leading-snug text-orange">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            Ukishatuma pesa, tuma ujumbe WhatsApp upate <strong>Access PIN</strong>{" "}
                            ya akaunti yako. Hairuhusiwi kushare PIN.
                          </span>
                        </div>
                      </div>

                      {waHref ? (
                        <Button
                          variant="green"
                          size="lg"
                          className="h-auto min-h-12 w-full whitespace-normal py-2.5 text-xs font-extrabold shadow-card"
                          asChild
                        >
                          <a href={waHref} target="_blank" rel="noreferrer">
                            <FaWhatsapp className="h-5 w-5 shrink-0" /> Contact WhatsApp Kupata
                            Access PIN
                          </a>
                        </Button>
                      ) : settings.data?.support_phone ? (
                        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-center text-xs text-muted-foreground">
                          Piga au tuma ujumbe kupata Access PIN:{" "}
                          <strong className="text-foreground">{settings.data.support_phone}</strong>
                        </p>
                      ) : null}

                      <div className="space-y-2 rounded-xl border border-border bg-surface p-3.5">
                        <label
                          htmlFor="manual-access-pin"
                          className="block text-xs font-bold text-foreground"
                        >
                          Jaza Access PIN uliyopewa na Admin
                        </label>
                        <Input
                          id="manual-access-pin"
                          aria-label="Access PIN au Tokeni"
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                          placeholder="Mf. TV-7K9M-3P2X"
                          className="h-12 font-mono text-center text-base font-extrabold tracking-widest uppercase"
                        />
                        <Button
                          variant="orange"
                          size="lg"
                          className="h-12 w-full whitespace-normal text-sm font-extrabold"
                          disabled={pinCode.trim().length < 4 || submitting}
                          onClick={submitManualPin}
                        >
                          {submitting ? <Spinner className="h-4 w-4" /> : <KeyRound />} FUNGUA KWA
                          ACCESS PIN
                        </Button>
                      </div>
                    </>
                  )}
                </section>
              ) : null}

              <div className="flex justify-between gap-3 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (step > 1 ? setStep(1) : handleOpenChange(false))}
                  disabled={submitting}
                >
                  <ArrowLeft /> Rudi
                </Button>
                {step === 1 ? (
                  <Button
                    variant="hero"
                    size="sm"
                    disabled={!pkg}
                    onClick={goToManualStep}
                    className="px-5"
                  >
                    ENDELEA KULIPA <ArrowRight />
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {stage === "done" ? (
            <div className="space-y-3 pt-6 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
              <p className="font-display text-3xl">Malipo Yamekamilika!</p>
              <p className="text-sm text-muted-foreground">{t("paywall.done")}</p>
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Spinner className="h-3.5 w-3.5" />{" "}
                {target.groupId ? "Tunafungua group…" : "Tunafungua video…"}
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
