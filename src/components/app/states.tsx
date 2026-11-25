import type { ReactNode } from "react";
import { AlertTriangle, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("h-6 w-6 animate-spin text-primary", className)} aria-label="Inapakia" />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-10 w-10" />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
        {icon ?? <Film className="h-6 w-6" />}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {body ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
      <p className="font-semibold">Imeshindikana kupakia</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {message ?? "Angalia mtandao wako kisha jaribu tena."}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Jaribu tena
        </Button>
      ) : null}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="space-y-3 px-4 sm:px-8">
      <div className="shimmer h-5 w-40 rounded" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="shimmer aspect-[2/3] w-[34vw] max-w-[180px] shrink-0 rounded-lg sm:w-[160px]"
          />
        ))}
      </div>
    </div>
  );
}
