import type { LucideIcon } from "lucide-react";

export function AdminMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className={`admin-metric-card ${accent ? "is-accent" : ""}`}>
      <div className="admin-metric-top">
        <span>{label}</span>
        <Icon size={16} strokeWidth={1.5} />
      </div>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}
