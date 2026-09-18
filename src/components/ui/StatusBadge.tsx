import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import type { Tone } from '../../features/operator/types/operator';
import { cn } from '@/lib/utils';

const badgeVariants = cva('badge', {
  variants: {
    tone: {
      success: 'badge-success',
      warning: 'badge-warning',
      danger: 'badge-danger',
      info: 'badge-info',
      neutral: 'badge-neutral',
    } satisfies Record<Tone, string>,
  },
  defaultVariants: { tone: 'neutral' },
});

export function StatusBadge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}
