import type { ReactNode } from 'react';
import { Icon } from '../../../../components/ui/Icon';
import { RouteTabs } from '../../../../components/ui/RouteTabs';
import { PageHeader } from '../../components/PageHeader';
import { aiTabs } from '../../constants/operatorRoutes';

export function AiPageShell({ active, children }: { active: string; children: ReactNode }) {
  return <><PageHeader section="ai" action={<span className="model-chip"><Icon name="spark"/>OPS Model v3.4 <span className="model-health"><i/>Healthy</span></span>}/><RouteTabs items={aiTabs} active={active}/><div className="model-audit-strip"><span><small>MODEL</small><strong>OPS-Energy v3.4.2</strong></span><span><small>INPUT SOURCES</small><strong>Telemetry · Weather · Route</strong></span><span><small>CALIBRATED</small><strong>Sep 12, 2026 · 02:10 UTC</strong></span><span><small>VALID RANGE</small><strong>Confidence ≥ 85%</strong></span></div>{children}</>;
}
