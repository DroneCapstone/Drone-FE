import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { PageHeader } from '../../components/PageHeader';

// Keep the existing "Ready orders" shortcut; only remove the redundant tab.
export function MissionPageShell({ children, showFlightHistory = false }: { active?: string; children: ReactNode; showFlightHistory?: boolean }) {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        section="missions"
        action={<>
          {showFlightHistory && (
            <ActionButton variant="secondary" onClick={() => navigate('/operator/operations/history')}>
              Flight history
            </ActionButton>
          )}
          <ActionButton variant="secondary" onClick={() => navigate('/operator/orders/ready')}>Ready orders</ActionButton>
        </>}
      />
      {children}
    </>
  );
}
