import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { BottomNav, TopBar } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const transparent = pathname === "/home" || pathname.startsWith("/video/");
  return (
    <div className="min-h-dvh pb-safe-nav md:pb-12">
      <TopBar transparent={transparent} />
      <Outlet />
      <BottomNav />
    </div>
  );
}
