import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { RouteTabs } from '../../../../components/ui/RouteTabs';
import { PageHeader } from '../../components/PageHeader';
import { missionTabs } from '../../constants/operatorRoutes';

export function MissionPageShell({ active, children }: { active: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        section="missions"
        action={<ActionButton variant="secondary" onClick={() => navigate('/operator/orders/ready')}>Ready orders</ActionButton>}
      />
      <RouteTabs items={missionTabs} active={active} />
      {children}
    </>
  );
}
