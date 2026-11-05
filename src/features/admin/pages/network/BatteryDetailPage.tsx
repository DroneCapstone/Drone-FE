import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from "../../components/AdminDialogContent";
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { getAdminBatteries, getAdminHubs, upsertAdminBattery } from '../../services/adminStore';
import { canRetireBattery } from '../../services/batteryLifecycle';
import { recordBatteryInspectionResult } from '../../services/adminReplacementSupply';
import { getReplacementRequests } from '../../services/prototypeWorkflow';
import { batteryOperationalTone } from '../../utils/adminDisplay';

/** Admin manages the battery record and its lifecycle, not BMS diagnostics. */
export function BatteryDetailPage() {
  const { batteryId } = useParams();
  const [, setVersion] = useState(0);
  const [retireOpen, setRetireOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('');
  const [inspectOpen, setInspectOpen] = useState(false);
  const [passed, setPassed] = useState(true);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    window.addEventListener('admin-data-updated', listener);
    return () => window.removeEventListener('admin-data-updated', listener);
  }, []);

  const battery = getAdminBatteries().find((item) => item.id === batteryId);
  if (!battery) return <Navigate to="/admin/network/batteries" replace />;
  const hub = getAdminHubs().find((item) => item.id === battery.hubId);
  const request = battery.replacementRequestId
    ? getReplacementRequests().find((item) => item.id === battery.replacementRequestId)
    : undefined;
  const canRetire = canRetireBattery(battery);
  const canRecordInspection = Boolean(
    battery.inspectionPending && (!battery.replacementRequestId || request?.status === 'FULFILLED'),
  );
  const retire = () => {
    if (!canRetire || !retireReason.trim()) return;
    const next = {
      ...battery,
      administrativeStatus: 'RETIRED' as const,
      operationalStatus: 'MAINTENANCE' as const,
      retiredBy: 'admin', retiredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retirementReason: retireReason.trim(),
    };
    upsertAdminBattery(next);
    setRetireOpen(false);
    setRetireReason('');
    setNotice(`${battery.id} has been retired. Its record is preserved.`);
  };
  const saveInspection = () => {
    try {
      recordBatteryInspectionResult(battery.id, passed, report);
      setInspectOpen(false); setError(''); setReport('');
      setNotice(passed ? 'Technician verification recorded. Battery is Ready.' : 'Verification failed. Battery remains unavailable.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save verification.'); }
  };

  return <AdminPageShell
    title={battery.id}
    description={`${battery.model} · ${hub?.name ?? battery.hubId}`}
    actions={<>
      {battery.inspectionPending && <ActionButton variant="secondary" disabled={!canRecordInspection}
        onClick={() => { setInspectOpen(true); setError(''); }}>Record Technician verification</ActionButton>}
      {battery.administrativeStatus === 'ACTIVE' && <ActionButton variant="danger" disabled={!canRetire}
        onClick={() => {setRetireReason(battery.retirementReason === 'TECHNICIAN_REPORTED_FAILURE' ? 'Battery reported damaged by Technician' : ''); setRetireOpen(true);}}>Retire battery</ActionButton>}
    </>}
  >
    {notice && <p className="mb-3 text-sm text-green-600" role="status">{notice}</p>}
    <OperatorPanel title="Battery information" eyebrow="IDENTITY & LIFECYCLE">
      <div className="detail-list">
        <span><small>Battery ID</small><strong>{battery.id}</strong></span>
        <span><small>Battery model</small><strong>{battery.model}</strong></span>
        <span><small>Serial number</small><strong>{battery.serialNumber}</strong></span>
        <span><small>Assigned Hub</small><strong>{hub?.name ?? battery.hubId}</strong></span>
        <span><small>Operational status</small><StatusBadge tone={batteryOperationalTone(battery.operationalStatus)}>{battery.inspectionPending ? 'PENDING VERIFICATION' : battery.operationalStatus}</StatusBadge></span>
        <span><small>Lifecycle</small><StatusBadge tone={battery.administrativeStatus === 'RETIRED' ? 'neutral' : 'success'}>{battery.administrativeStatus}</StatusBadge></span>
        {battery.replacementRequestId && <span><small>Replacement request</small><Link className="text-button" to={`/admin/approvals?request=${encodeURIComponent(battery.replacementRequestId)}`}>{battery.replacementRequestId}</Link></span>}
        {(battery.administrativeStatus === 'RETIRED' || battery.retirementReason === 'TECHNICIAN_REPORTED_FAILURE') && battery.retirementReason && <span><small>Retirement / issue reason</small><strong>{battery.retirementReason === 'TECHNICIAN_REPORTED_FAILURE' ? 'Reported damaged by Technician' : battery.retirementReason === 'PHYSICAL_DAMAGE' ? 'Physical damage' : battery.retirementReason === 'MAX_CYCLE_REACHED' ? 'Previously retired under legacy policy' : battery.retirementReason === 'SOH_BELOW_THRESHOLD' ? 'Previously retired under legacy policy' : battery.retirementReason}</strong></span>}
        {battery.retiredAt && <span><small>Retired at</small><strong>{new Date(battery.retiredAt).toLocaleString('en-GB')}</strong></span>}
        {battery.inspectionNote && <span><small>Latest Technician verification</small><strong>{battery.inspectionNote}</strong></span>}
      </div>
      {battery.inspectionPending && <p className="mt-4 text-sm text-[var(--admin-muted)]">This new battery is not available for missions until Technician receipt and verification are confirmed.</p>}
      {battery.operationalStatus === 'INSTALLED' && <p className="mt-4 text-sm text-[var(--admin-muted)]">Retirement is disabled while this battery is installed. Technician must safely remove it first.</p>}
    </OperatorPanel>

    <Dialog open={inspectOpen} onOpenChange={(open) => !open && setInspectOpen(false)}><DialogContent><div className="p-5">
      <DialogTitle className="text-lg font-semibold">Record Technician verification</DialogTitle>
      <p className="mt-2 text-sm text-muted-foreground">Admin records the basic receipt and readiness result reported by Technician for {battery.id}.</p>
      <label className="mt-4 block text-sm"><span>Result</span><select className="mt-2 w-full" value={passed ? 'PASS' : 'FAIL'} onChange={(event) => setPassed(event.target.value === 'PASS')}><option value="PASS">Passed — mark Ready</option><option value="FAIL">Failed — keep Maintenance</option></select></label>
      <label className="mt-4 block text-sm"><span>Technician report / reference</span><textarea required className="mt-2 w-full rounded-md border border-border bg-transparent p-3" rows={3} value={report} onChange={(event) => setReport(event.target.value)} /></label>
      {error && <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>}
      <div className="form-actions mt-4"><ActionButton variant="secondary" onClick={() => setInspectOpen(false)}>Cancel</ActionButton><ActionButton disabled={!report.trim()} onClick={saveInspection}>Save result</ActionButton></div>
    </div></DialogContent></Dialog>

    <Dialog open={retireOpen} onOpenChange={(open) => !open && setRetireOpen(false)}><DialogContent><div className="p-5">
      <DialogTitle className="text-lg font-semibold">Retire {battery.id}?</DialogTitle>
      <p className="mt-2 text-sm text-muted-foreground">Retirement removes this battery from operational availability. Its Battery ID and history will be retained.</p>
      <label className="mt-4 block text-sm"><span>Retirement reason (required)</span><textarea required className="mt-2 w-full rounded-md border border-border bg-transparent p-3" rows={3} value={retireReason} onChange={(event) => setRetireReason(event.target.value)} /></label>
      <div className="form-actions mt-5"><ActionButton variant="secondary" onClick={() => setRetireOpen(false)}>Cancel</ActionButton><ActionButton variant="danger" disabled={!retireReason.trim()} onClick={retire}>Confirm retirement</ActionButton></div>
    </div></DialogContent></Dialog>
  </AdminPageShell>;
}
