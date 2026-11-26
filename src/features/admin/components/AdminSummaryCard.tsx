import type { LucideIcon } from 'lucide-react';

/**
 * Compact Admin statistics card, matching New Batteries.
 * Styles are local so the Operator metric strip / Admin theme cannot remove
 * the elevated white background, light border or soft shadow.
 */
export function AdminSummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: LucideIcon;
}) {
  return (
    <div
      className="flex min-w-0 flex-col justify-center px-4 py-3"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #DDE2E8',
        borderRadius: 12,
        boxShadow: '0 8px 22px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.05)',
        minHeight: 88,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-xs font-medium text-[var(--admin-muted)]">{label}</span>
        <Icon size={18} strokeWidth={1.8} className="shrink-0 text-[#FF6B00]" aria-hidden="true" />
      </div>
      <strong className="mt-1 block break-words text-2xl font-bold leading-tight text-[var(--admin-text)]">
        {value}
      </strong>
    </div>
  );
}
