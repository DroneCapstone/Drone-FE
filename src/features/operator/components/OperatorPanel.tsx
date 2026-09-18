import type { ReactNode } from 'react';
import { Card } from '../../../components/ui/Card';

export function OperatorPanel({ title, eyebrow, action, children, className = '' }: { title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <Card className={className}>{(title || eyebrow || action) && <div className="panel-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}{title && <h2>{title}</h2>}</div>{action}</div>}{children}</Card>;
}
