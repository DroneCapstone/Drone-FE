import type { ReactNode } from 'react';
import type { DetailTab } from './droneDetailData';

export function DetailCard({ title, action, children, className = '' }: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return <section className={`dd-card ${className}`}>
    <div className="dd-card-heading">
      <h2 className="dd-card-title">{title}</h2>
      {action && <div className="dd-card-action">{action}</div>}
    </div>
    {children}
  </section>;
}
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="dd-row"><span className="dd-row-label">{label}</span><span className="dd-row-value">{children}</span></div>;
}
export function MasterFact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="dd-fact"><span className="dd-fact-label">{label}</span><strong className="dd-fact-value">{children}</strong></div>;
}
export function DetailBadge({ tone, children }: { tone: 'green' | 'blue' | 'red' | 'orange' | 'gray'; children: ReactNode }) {
  return <span className={`dd-badge dd-badge--${tone}`}>{children}</span>;
}
export function DemoNote({ category: _category }: { category: string }) {
  // The prototype keeps the note hidden without returning undefined JSX.
  return null;
}
export const detailTabs: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'orders', label: 'Work Orders' },
  { id: 'flights', label: 'Flight History' },
];
