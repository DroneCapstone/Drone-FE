import type { ReactNode } from 'react';
import { Icon } from '../../../../components/ui/Icon';
import { RouteTabs } from '../../../../components/ui/RouteTabs';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { PageHeader } from '../../components/PageHeader';
import { operationTabs } from '../../constants/operatorRoutes';

export function OperationPageShell({ active, children }: { active: string; children: ReactNode }) {
  return <><PageHeader section="operations" action={<div className="weather-chip"><Icon name="cloud"/><span>29°C · NE 11 km/h</span><StatusBadge tone="success">Good to fly</StatusBadge></div>}/><RouteTabs items={operationTabs} active={active}/>{children}</>;
}
