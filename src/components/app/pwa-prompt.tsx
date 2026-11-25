import { Download, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOnlineStatus, usePWAInstall } from "@/hooks/use-pwa";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-14 z-50 flex items-center justify-center gap-2 border-b border-orange/40 bg-orange/15 px-3 py-1.5 text-xs font-bold text-orange backdrop-blur-md sm:top-16"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>Hauna mtandao (Offline) — Baadhi ya video zinahitaji intaneti</span>
    </div>
  );
}

export function PWAInstallButton({ fullWidth }: { fullWidth?: boolean }) {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  if (isInstalled || !isInstallable) return null;

  return (
    <Button
      type="button"
      variant="soft"
      size="sm"
      className={fullWidth ? "h-11 w-full font-bold" : "h-9 gap-1.5 px-3 text-xs font-bold"}
      onClick={async () => {
        const ok = await promptInstall();
        if (ok) toast.success("TRANDING VIDEO imewekwa kwenye simu yako!");
      }}
    >
      <Download className="h-3.5 w-3.5" /> Sakinisha App
    </Button>
  );
}
