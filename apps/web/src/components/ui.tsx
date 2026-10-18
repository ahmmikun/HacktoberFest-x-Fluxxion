import type { CheckStatus, Severity } from "@reposage/shared";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({ title, actions, children, className }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm", className)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-zinc-100">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ children, tone = "zinc", className, title }: { children: React.ReactNode; tone?: Tone; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}

export type Tone = "zinc" | "green" | "amber" | "red" | "sky" | "violet" | "rose";

const TONES: Record<Tone, string> = {
  zinc: "border-zinc-700 bg-zinc-800 text-zinc-300",
  green: "border-emerald-700/60 bg-emerald-950 text-emerald-300",
  amber: "border-amber-700/60 bg-amber-950 text-amber-300",
  red: "border-red-700/60 bg-red-950 text-red-300",
  sky: "border-sky-700/60 bg-sky-950 text-sky-300",
  violet: "border-violet-700/60 bg-violet-950 text-violet-300",
  rose: "border-rose-700/60 bg-rose-950 text-rose-300",
};

export const STATUS_TONE: Record<CheckStatus, Tone> = {
  PASS: "green",
  WARN: "amber",
  FAIL: "red",
  SKIPPED_INSUFFICIENT_EVIDENCE: "zinc",
};

export const STATUS_LABEL: Record<CheckStatus, string> = {
  PASS: "Pass",
  WARN: "Warn",
  FAIL: "Fail",
  SKIPPED_INSUFFICIENT_EVIDENCE: "Skipped",
};

export const SEVERITY_TONE: Record<Severity, Tone> = {
  CRITICAL: "rose",
  HIGH: "red",
  MEDIUM: "amber",
  LOW: "sky",
};

export function scoreColor(score: number | null): string {
  if (score === null) return "text-zinc-500";
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export function scoreStroke(score: number | null): string {
  if (score === null) return "#52525b";
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  return "#f87171";
}

export function Button({
  children,
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-500 disabled:bg-sky-900 disabled:text-sky-300",
    secondary: "border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 disabled:opacity-50",
    danger: "bg-red-600 text-white hover:bg-red-500 disabled:opacity-50",
    ghost: "text-zinc-300 hover:bg-zinc-800 disabled:opacity-50",
  };
  return (
    <button
      type="button"
      {...props}
      className={cx("inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed", variants[variant], className)}
    >
      {children}
    </button>
  );
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
