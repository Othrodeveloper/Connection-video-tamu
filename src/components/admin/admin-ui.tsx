import { useRef, useState, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/app/states";
import { errorMessage } from "@/lib/queries";

export function AdminTitle({
  children,
  sub,
  action,
}: {
  children: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-4xl leading-none sm:text-5xl">{children}</h1>
        {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface ${className}`}>{children}</div>
  );
}

export function FieldRow({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** URL input with an upload button next to it. `upload` returns the stored URL. */
export function UploadField({
  label,
  value,
  onChange,
  upload,
  accept,
  hint,
  preview,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  upload: (f: File, onProgress: (pct: number) => void) => Promise<string>;
  accept: string;
  hint?: string | undefined;
  preview?: "image" | "none" | undefined;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  return (
    <FieldRow label={label} hint={hint}>
      <div className="flex gap-2">
        {preview === "image" && value ? (
          <img src={value} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
        ) : null}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… au pakia faili"
          className="min-w-0"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => ref.current?.click()}
          aria-label={`Pakia ${label}`}
        >
          {busy ? <Spinner className="h-4 w-4" /> : <Upload />}
        </Button>
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            setPct(0);
            try {
              onChange(await upload(f, setPct));
              toast.success("Faili limepakiwa");
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setBusy(false);
              setPct(null);
            }
          }}
        />
      </div>
      {busy && pct !== null ? (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${Math.max(2, pct)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Inapakia… {pct}% — usifunge ukurasa huu
          </p>
        </div>
      ) : null}
    </FieldRow>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      {label}
    </label>
  );
}

export const selectCls = "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm";
