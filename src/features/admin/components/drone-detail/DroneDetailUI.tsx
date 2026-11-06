import type { ReactNode } from 'react';
import type { DetailTab } from './droneDetailData';

export function DetailCard({ eyebrow, title, action, children, className = '' }: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return <section className={`dd-card ${className}`}>
    <div className="dd-card-heading">
      <div><div className="dd-eyebrow">{eyebrow}</div><h2 className="dd-card-title">{title}</h2></div>
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
export function DemoNote({ category }: { category: string }) {
  return <p className="dd-demo-note">Demo {category} · not connected to Technician/Operator API.</p>;
}
export const detailTabs: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'orders', label: 'Work Orders' },
  { id: 'flights', label: 'Flight History' },
];
