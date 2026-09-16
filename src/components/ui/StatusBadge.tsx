import type { ReactNode } from 'react';
import type { Tone } from '../../features/operator/types/operator';

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
