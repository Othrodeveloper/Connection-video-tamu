import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Search, Bookmark, Users, User, Shield } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Brand } from "@/components/app/brand";
import { CountdownChip } from "@/components/app/countdown";
import { OfflineIndicator, PWAInstallButton } from "@/components/app/pwa-prompt";
import { useNotifications, useProfile, useSubscription } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useText, type TextKey } from "@/lib/site-text";

const NAV = [
  { to: "/home", label: "nav.home", icon: Home },
  { to: "/tafuta", label: "nav.search", icon: Search },
  { to: "/orodha", label: "nav.list", icon: Bookmark },
  { to: "/magroup", label: "nav.groups", icon: Users },
  { to: "/profile", label: "nav.profile", icon: User },
] as const satisfies readonly { to: string; label: TextKey; icon: unknown }[];

function useUnreadCount() {
  const notes = useNotifications();
  const profile = useProfile();
  if (!notes.data || !profile.data) return 0;
  const seen = new Date(profile.data.notifications_seen_at).getTime();
  return notes.data.filter((n) => {
    if (n.kind === "new_video" && !profile.data!.notify_new_videos) return false;
    if (n.kind === "new_episode" && !profile.data!.notify_new_episodes) return false;
    return new Date(n.created_at).getTime() > seen;
  }).length;
}

export function TopBar({ transparent }: { transparent?: boolean }) {
  const sub = useSubscription();
  const unread = useUnreadCount();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useText();
  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
          transparent && !scrolled
            ? "bg-transparent"
            : "border-b border-border bg-background/90 backdrop-blur-lg",
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-8">
          <div className="flex items-center gap-8">
            <Brand to="/home" />
            <nav className="hidden items-center gap-5 md:flex" aria-label="Menyu kuu">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    pathname.startsWith(n.to)
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(n.label)}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <PWAInstallButton />
            {sub.isAdmin ? (
              <Link
                to="/admin"
                className="flex h-9 items-center gap-1.5 rounded-full bg-gold/15 px-3 text-xs font-bold text-gold hover:bg-gold/25"
              >
                <Shield className="h-4 w-4" /> Admin
              </Link>
            ) : null}
            {sub.expiresAt ? <CountdownChip expiresAt={sub.expiresAt} /> : null}
            <Link
              to="/arifa"
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/10"
              aria-label="Arifa"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>
      <OfflineIndicator />
    </>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useText();
  return (
    <nav
      aria-label="Menyu ya chini"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <li key={n.to}>
              <Link
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/15",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className="max-w-full truncate px-0.5">{t(n.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-7xl px-4 pt-20 sm:px-8 sm:pt-24", className)}>{children}</div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">{children}</h1>
      {sub ? <p className="mt-2 text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
