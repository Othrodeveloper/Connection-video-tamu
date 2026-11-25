import { createFileRoute, Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Shield,
  Sparkles,
  Plug,
  Bell,
  CreditCard,
  Film,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Tags,
  Users,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/app/brand";
import { Spinner } from "@/components/app/states";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useAdminAccess, hasSection } from "@/lib/admin-access";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — TRANDING VIDEO" },
      { name: "description", content: "Utawala wa TRANDING VIDEO." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — TRANDING VIDEO" },
      { property: "og:description", content: "Utawala wa TRANDING VIDEO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/videos", label: "Video", icon: Film },
  { to: "/admin/takwimu", label: "Takwimu za Video", icon: BarChart3 },
  { to: "/admin/categories", label: "Kategoria", icon: Tags },
  { to: "/admin/groups", label: "Magroup", icon: UsersRound },
  { to: "/admin/packages", label: "Vifurushi", icon: Package },
  { to: "/admin/payments", label: "Malipo", icon: CreditCard },
  { to: "/admin/tokens", label: "Access PIN", icon: KeyRound },
  { to: "/admin/users", label: "Watumiaji", icon: Users },
  { to: "/admin/notifications", label: "Arifa", icon: Bell },
  { to: "/admin/settings", label: "Mipangilio", icon: Settings },
  { to: "/admin/staff", label: "Maadmin", icon: Shield },
  { to: "/admin/connection", label: "Unganisha Malipo", icon: Plug },
  { to: "/admin/clean", label: "Usafishaji", icon: Sparkles },
] as const;

function AdminLayout() {
  const { session, ready } = useAuth();
  const admin = useIsAdmin();
  const access = useAdminAccess();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!ready || (session && (admin.isLoading || access.isLoading))) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }
  // The admin area is hidden: visitors are sent to the normal login, other users back to the site.
  if (!session) return <Navigate to="/auth" search={{ mode: "login" }} replace />;
  if (!admin.data) return <Navigate to="/home" replace />;

  const sectionFor = (to: string) =>
    to === "/admin" || to === "/admin/takwimu"
      ? "dashboard"
      : to.includes("categories") || to.includes("videos")
        ? "videos"
        : to === "/admin/tokens"
          ? "payments"
          : ["/admin/staff", "/admin/connection", "/admin/clean"].includes(to)
            ? "admins"
            : (to.split("/")[2] ?? "dashboard");
  const visibleNav = NAV.filter((n) => hasSection(access.data, sectionFor(n.to)));
  const currentNav =
    [...NAV].reverse().find((n) => n.to !== "/admin" && pathname.startsWith(n.to)) ?? NAV[0];
  const allowedPage = currentNav && hasSection(access.data, sectionFor(currentNav.to));
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === to + "/" : pathname.startsWith(to);

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 flex h-dvh flex-col p-4">
          <div className="mb-6 flex items-center gap-2">
            <Brand to="/admin" />
          </div>
          <nav className="space-y-1" aria-label="Admin">
            {visibleNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  isActive(n.to, "exact" in n)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-1">
            <Link
              to="/home"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Film className="h-4 w-4" /> Fungua Tovuti
            </Link>
            <Button
              variant="ghost"
              onClick={async () => {
                await qc.cancelQueries();
                qc.clear();
                await supabase.auth.signOut();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Toka
            </Button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Brand to="/admin" />
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
              ADMIN
            </span>
          </div>
          <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Admin">
            {visibleNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                  isActive(n.to, "exact" in n)
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-muted-foreground",
                )}
              >
                <n.icon className="h-3.5 w-3.5" /> {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          {allowedPage ? (
            <Outlet />
          ) : (
            <div className="space-y-4 py-12">
              <h1 className="text-xl font-bold">Chagua sehemu ya kusimamia</h1>
              <p className="text-muted-foreground">Sehemu hii haipo kwenye ruhusa zako.</p>
              <div className="flex flex-wrap gap-2">
                {visibleNav.map((n) => (
                  <Button key={n.to} variant="blue" asChild>
                    <Link to={n.to}>{n.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
