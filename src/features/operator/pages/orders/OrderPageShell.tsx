import type { ReactNode } from 'react';
import { RouteTabs } from '../../../../components/ui/RouteTabs';
import { PageHeader } from '../../components/PageHeader';
import { orderTabs } from '../../constants/operatorRoutes';

export function OrderPageShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <>
      <PageHeader section="orders" />
      <RouteTabs items={orderTabs} active={active} />
      {children}
    </>
  );
}
