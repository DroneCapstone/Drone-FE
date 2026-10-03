import type { LucideIcon } from "lucide-react";

export function AdminMetricCard({ label, value, helper, icon: Icon, accent = false }: { label: string; value: string | number; helper?: string; icon: LucideIcon; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-orange-500/25 bg-orange-500/[0.06]" : "border-[var(--admin-border)] bg-[var(--admin-surface)]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-[var(--admin-muted)]">{label}</p>
          <p className="mt-2 text-[26px] font-semibold tracking-tight text-[var(--admin-text)]">{value}</p>
          {helper && <p className="mt-1 text-[11px] text-[var(--admin-muted)]">{helper}</p>}
        </div>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent ? "bg-orange-500 text-white" : "bg-[var(--admin-surface-2)] text-orange-500"}`}><Icon size={17} /></span>
      </div>
    </div>
  );
}
