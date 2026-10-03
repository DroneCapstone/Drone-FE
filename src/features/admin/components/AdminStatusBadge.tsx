import type { ReactNode } from "react";

export function AdminStatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const tones = {
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    danger: "border-red-500/20 bg-red-500/10 text-red-500",
    info: "border-sky-500/20 bg-sky-500/10 text-sky-500",
    neutral: "border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-muted)]",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}
