import type React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Gift, Lock, Phone, User } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand, LogoRings } from "@/components/app/brand";
import { BlueCircles } from "@/components/app/blue-circles";
import { useText } from "@/lib/site-text";
import { copyrightLine, useContent } from "@/lib/site-content";
import { Spinner } from "@/components/app/states";
import { useAuth } from "@/hooks/use-auth";
import { normalizePhone, phoneToEmail } from "@/lib/phone";
import { claimReferralWelcome } from "@/lib/referral.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    redirect: z.string().optional(),
    mode: z.enum(["login", "register"]).optional(),
    ref: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Ingia au Jisajili — TRANDING VIDEO" },
      {
        name: "description",
        content: "Ingia kwa namba ya simu na password, au fungua akaunti mpya.",
      },
      { property: "og:title", content: "Ingia au Jisajili — TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Ingia kwa namba ya simu na password, au fungua akaunti mpya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(r?: string) {
  if (!r) return null;
  try {
    const u = new URL(r, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, ready } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(
    search.mode ?? (search.ref ? "register" : "login"),
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [ref, setRef] = useState(search.ref ?? "");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = useText();
  const content = useContent();

  /** Admins go straight to the admin panel; everyone else to where they were heading. */
  async function goAfterLogin(uid: string) {
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (isAdmin) {
      navigate({ to: "/admin", replace: true });
      return;
    }
    const target = safeRedirect(search.redirect);
    navigate({ to: (target as "/home") ?? "/home", replace: true });
  }

  useEffect(() => {
    if (ready && session && !busy) void goAfterLogin(session.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!normalized) {
      toast.error("Weka namba sahihi ya simu, mfano 0754 123 456");
      return;
    }
    if (password.length < 6) {
      toast.error("Password iwe na herufi 6 au zaidi");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        if (name.trim().length < 2) {
          toast.error("Weka jina lako kamili");
          return;
        }
        const cleanRef = ref.trim().toUpperCase();
        const { data, error } = await supabase.auth.signUp({
          email: phoneToEmail(normalized),
          password,
          options: {
            data: { full_name: name.trim(), phone: normalized, referral_code: cleanRef },
          },
        });
        if (error) {
          if (/already|registered|exists/i.test(error.message))
            toast.error("Namba hii tayari imesajiliwa. Ingia badala yake.");
          else if (/pwned|leaked|weak/i.test(error.message))
            toast.error("Password hii si salama. Chagua password nyingine.");
          else toast.error(error.message);
          return;
        }
        if (!data.session) {
          toast.error("Akaunti imeundwa lakini haikuweza kuingia. Jaribu kuingia.");
          setMode("login");
          return;
        }
        if (cleanRef.length >= 2) {
          try {
            const reward = await claimReferralWelcome({ data: { code: cleanRef } });
            if (reward.ok && reward.grantedMinutes > 0) {
              toast.success(
                `Hongera! Umepata dakika ${reward.grantedMinutes} za bure kwa Promo Code ${cleanRef}!`,
              );
            } else {
              toast.success(`Karibu, ${name.trim().split(" ")[0]}!`);
            }
          } catch {
            toast.success(`Karibu, ${name.trim().split(" ")[0]}!`);
          }
        } else {
          toast.success(`Karibu, ${name.trim().split(" ")[0]}!`);
        }
        navigate({ to: "/karibu", replace: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: phoneToEmail(normalized),
          password,
        });
        if (error || !data.user) {
          toast.error("Namba ya simu au password si sahihi");
          return;
        }
        await goAfterLogin(data.user.id);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <img
        src={content.auth_image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-hero-bottom" />
      <div className="absolute inset-0 bg-scrim" />
      <BlueCircles />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
        <Brand />
        <div className="my-auto py-8">
          <div className="rounded-2xl border border-blue/30 bg-background/80 p-6 shadow-blue backdrop-blur-xl">
            <div className="mb-4 flex justify-center">
              <LogoRings />
            </div>
            <h1 className="text-center font-display text-4xl leading-none">
              {mode === "login" ? t("auth.login.title") : t("auth.register.title")}
            </h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {mode === "login" ? t("auth.login.sub") : t("auth.register.sub")}
            </p>

            <div className="mt-5 grid grid-cols-2 rounded-lg bg-surface p-1 text-sm font-semibold">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md py-2 transition-colors",
                    mode === m
                      ? m === "login"
                        ? "bg-gradient-blue text-primary-foreground"
                        : "bg-gradient-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {m === "login" ? "Ingia" : "Jisajili"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === "register" ? (
                <Field id="name" label="Jina kamili" icon={<User className="h-4 w-4" />}>
                  <Input
                    id="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mf. Amina Juma"
                    className="h-12 pl-9"
                  />
                </Field>
              ) : null}
              <Field id="phone" label="Namba ya simu" icon={<Phone className="h-4 w-4" />}>
                <Input
                  id="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0754 123 456"
                  className="h-12 pl-9"
                />
              </Field>
              <Field id="password" label="Password" icon={<Lock className="h-4 w-4" />}>
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Angalau herufi 6"
                  className="h-12 pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPw ? "Ficha password" : "Onyesha password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Field>
              {mode === "register" ? (
                <Field
                  id="ref"
                  label="Promo Code / Mwaliko (pata dk 20 bure)"
                  icon={<Gift className="h-4 w-4 text-gold" />}
                >
                  <Input
                    id="ref"
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    placeholder="Mf. A1B2C3 (si lazima)"
                    className="h-12 pl-9 uppercase"
                  />
                </Field>
              ) : null}
              <Button
                type="submit"
                variant={mode === "login" ? "blue" : "hero"}
                size="lg"
                className="w-full"
                disabled={busy}
              >
                {busy ? <Spinner className="h-4 w-4 text-primary-foreground" /> : null}
                {mode === "login" ? "Ingia" : "Jisajili"}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {mode === "login" ? "Huna akaunti? " : "Una akaunti tayari? "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="font-semibold text-blue-glow"
              >
                {mode === "login" ? "Jisajili" : "Ingia"}
              </button>
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              ← Rudi mwanzo
            </Link>
          </p>
          {content.copyright.trim() ? (
            <p className="mt-6 text-center text-[11px] text-muted-foreground">
              {copyrightLine(content.copyright)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}
