import type { ReactNode } from 'react';
import { Icon } from '../../../../components/ui/Icon';
import { RouteTabs } from '../../../../components/ui/RouteTabs';
import { PageHeader } from '../../components/PageHeader';
import { aiTabs } from '../../constants/operatorRoutes';

export function AiPageShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <>
      <PageHeader
        section="ai"
        action={<span className="model-chip"><Icon name="spark" />Energy Model <span className="model-health"><i />Ready</span></span>}
      />
      <RouteTabs items={aiTabs} active={active} />
      {/* <div className="model-audit-strip">
        <span><small>ROLE</small><strong>Decision support only</strong></span>
        <span><small>INPUT SOURCES</small><strong>Order · Drone · Route · Weather</strong></span>
        <span><small>PRIMARY OUTPUTS</small><strong>Energy · Duration · Timing · Risk</strong></span>
        <span><small>EXPLAINABILITY</small><strong>Local SHAP + operational rules</strong></span>
      </div> */}
      {children}
    </>
  );
}
