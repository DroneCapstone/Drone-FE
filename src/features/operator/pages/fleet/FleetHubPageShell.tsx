import type { ReactNode } from 'react';
import { RouteTabs } from '../../../../components/ui/RouteTabs';
import { PageHeader } from '../../components/PageHeader';
import { fleetHubTabs } from '../../constants/operatorRoutes';

export function FleetHubPageShell({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader section="fleet" />
      <RouteTabs items={fleetHubTabs} active={active} />
      {children}
    </>
  );
}
