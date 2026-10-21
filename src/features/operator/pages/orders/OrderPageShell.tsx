import type { ReactNode } from 'react';
import { PageHeader } from '../../components/PageHeader';

// The Orders list uses the status dropdown; no separate All / Ready tabs.
export function OrderPageShell({ children }: { active?: string; children: ReactNode }) {
  return (
    <>
      <PageHeader section="orders" />
      {children}
    </>
  );
}
