import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { PageHeader } from '../../components/PageHeader';

// Keep the existing "Ready orders" shortcut; only remove the redundant tab.
export function MissionPageShell({ children }: { active?: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        section="missions"
        action={<ActionButton variant="secondary" onClick={() => navigate('/operator/orders/ready')}>Ready orders</ActionButton>}
      />
      {children}
    </>
  );
}
