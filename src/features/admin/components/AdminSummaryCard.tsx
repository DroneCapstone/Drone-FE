import type { LucideIcon } from 'lucide-react';

/** Admin KPI card uses Operator density and the active workspace theme. */
export function AdminSummaryCard({ label, value, icon: Icon }: {
  label: string;
  value: string | number;
  note?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="admin-summary-card flex min-w-0 flex-col justify-center">
      <div className="flex items-center justify-between gap-2">
        <span className="admin-summary-label min-w-0">{label}</span>
        <Icon size={18} strokeWidth={1.8} className="shrink-0 text-[var(--orange)]" aria-hidden="true" />
      </div>
      <strong className="admin-summary-value block break-words">{value}</strong>
    </div>
  );
}
