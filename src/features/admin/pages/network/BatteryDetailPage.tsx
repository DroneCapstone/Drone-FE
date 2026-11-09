import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, ClipboardList } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminPageShell } from '../../components/AdminPageShell';
import { getAdminBatteries, getAdminDrones, getAdminHubs, upsertAdminBattery } from '../../services/adminStore';
import { canRetireBattery } from '../../services/batteryLifecycle';
import { getReplacementRequests } from '../../services/prototypeWorkflow';
import { getAdminEffectiveStatus, getAdminSupplyRecords } from '../../services/adminReplacementSupply';
import { batteryOperationalTone } from '../../utils/adminDisplay';
import './BatteryDetailPage.css';

/** Admin sees battery identity, assignment and lifecycle only.
 * Operational verification and install/remove actions belong to Technician.
 * Browser-local prototype; no live Technician/Operator API synchronization. */
export function BatteryDetailPage() {
  const { batteryId } = useParams();
  const [, refreshVersion] = useState(0);
  const [retireOpen, setRetireOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const refresh = () => refreshVersion((current) => current + 1);
    window.addEventListener('admin-data-updated', refresh);
    return () => window.removeEventListener('admin-data-updated', refresh);
  }, []);

  const battery = getAdminBatteries().find((item) => item.id === batteryId);
  if (!battery) return <Navigate to="/admin/network/batteries" replace />;

  const hub = getAdminHubs().find((item) => item.id === battery.hubId);
  const drones = getAdminDrones();
  const linkedDrone = drones.find((item) => item.installedBatteryId === battery.id || item.id === battery.droneId);
  const isStillLinked = Boolean(battery.droneId || drones.some((item) => item.installedBatteryId === battery.id));

  // Link both sides of a replacement: damaged battery (request.batteryId),
  // or new/supplied battery (record.selectedBatteryId/registeredBatteryId).
  const records = getAdminSupplyRecords();
  const related = getReplacementRequests()
    .filter((request) => request.type === 'BATTERY' && (
      request.batteryId === battery.id ||
      battery.replacementRequestId === request.id ||
      records.some((record) => record.requestId === request.id &&
        (record.selectedBatteryId === battery.id || record.registeredBatteryId === battery.id))
    ))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Local guard only. Backend must additionally validate active mission
  // reservations, work orders and Technician's actual removal confirmation.
  const activeReplacement = related.some((request) =>
    !['RECEIVED', 'REJECTED'].includes(getAdminEffectiveStatus(request))
  );
  const canRetire = canRetireBattery(battery) && !isStillLinked && !activeReplacement;
  const canShowHistory = related.length > 0 || Boolean(battery.retiredAt || battery.retirementReason || battery.inspectionNote || battery.inspectionCheckedAt || battery.inspectionPending);

  const timeLabel = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB');
  };
  const issueReason = (value?: string) => {
    if (!value) return '—';
    if (value === 'TECHNICIAN_REPORTED_FAILURE') return 'Reported damaged by Technician';
    if (value === 'PHYSICAL_DAMAGE') return 'Physical damage';
    if (value === 'MAX_CYCLE_REACHED' || value === 'SOH_BELOW_THRESHOLD') return 'Retired under legacy policy';
    return value;
  };

  const retire = () => {
    setError('');
    // Always recheck at submit time, not just when the popup was opened.
    const latest = getAdminBatteries().find((item) => item.id === battery.id);
    if (!latest) { setError('This battery no longer exists.'); return; }
    const linked = Boolean(latest.droneId || getAdminDrones().some((item) => item.installedBatteryId === latest.id));
    const freshRecords = getAdminSupplyRecords();
    const stillOpen = getReplacementRequests().some((request) => request.type === 'BATTERY' &&
      (request.batteryId === latest.id || latest.replacementRequestId === request.id ||
        freshRecords.some((record) => record.requestId === request.id &&
          (record.selectedBatteryId === latest.id || record.registeredBatteryId === latest.id))) &&
      !['RECEIVED', 'REJECTED'].includes(getAdminEffectiveStatus(request)));
    if (!canRetireBattery(latest) || linked || stillOpen) {
      setError('Cannot retire: battery remains installed, awaiting verification or linked to an open replacement.');
      return;
    }
    if (!retireReason.trim()) { setError('Enter a retirement reason.'); return; }
    try {
      const stamp = new Date().toISOString();
      upsertAdminBattery({
        ...latest, administrativeStatus: 'RETIRED',
        operationalStatus: 'MAINTENANCE', retiredAt: stamp, retiredBy: 'admin',
        retirementReason: retireReason.trim(), updatedAt: stamp
      });
      setRetireOpen(false);
      setRetireReason('');
      setNotice(`${battery.id} retired. The battery record has been preserved.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Retirement could not be saved.');
    }
  };

  return <AdminPageShell
    title={battery.id}
    description={`${battery.model} · ${hub?.name ?? (battery.hubId || 'Not assigned to a Hub')}`}
    hideSectionTabs
    actions={battery.administrativeStatus === 'ACTIVE' ?
      <ActionButton variant="danger" disabled={!canRetire} title={!canRetire ? 'Remove from Drone and complete outstanding checks / replacement first.' : 'Retire this battery'}
        onClick={() => { setError(''); setRetireOpen(true); }}>Retire battery</ActionButton> :
      <StatusBadge tone="neutral">RETIRED</StatusBadge>}
  >
    <div className="admin-battery-detail">
      <div className="abd-back"><Link to="/admin/network/batteries"><ArrowLeft size={16} /> Back to Batteries</Link></div>
      {notice && <p role="status" className="abd-notice">{notice}</p>}
      <div className="abd-grid">
        <section className="abd-card" aria-labelledby="abd-information-title">
          <h2 id="abd-information-title">Battery information</h2>
          <dl className="abd-data">
            <div><dt>Battery ID</dt><dd>{battery.id}</dd></div>
            <div><dt>Battery model</dt><dd>{battery.model}</dd></div>
            <div><dt>Serial number</dt><dd>{battery.serialNumber}</dd></div>
            <div><dt>Assigned Hub</dt><dd>{hub ? <Link to={`/admin/network/hubs/${hub.id}`} className="abd-link">{hub.name}<ExternalLink size={12} /></Link> : (battery.hubId || 'Not assigned')}</dd></div>
          </dl>
        </section>
        <section className="abd-card" aria-labelledby="abd-status-title">
          <h2 id="abd-status-title">Status &amp; assignment</h2>
          <dl className="abd-data">
            <div><dt>Operational status</dt><dd><StatusBadge tone={batteryOperationalTone(battery.operationalStatus)}>{battery.operationalStatus}</StatusBadge></dd></div>
            <div><dt>Lifecycle</dt><dd><StatusBadge tone={battery.administrativeStatus === 'RETIRED' ? 'neutral' : 'success'}>{battery.administrativeStatus}</StatusBadge></dd></div>
            <div><dt>Installed on Drone</dt><dd>{linkedDrone ? <Link to={`/admin/network/drones/${linkedDrone.id}`} className="abd-link">{linkedDrone.id}<ExternalLink size={12} /></Link> : (battery.droneId || 'Not installed')}</dd></div>
            <div><dt>Charge level</dt><dd>{Number.isFinite(battery.chargeLevelPct) ? `${battery.chargeLevelPct}%` : '—'}</dd></div>
            {battery.inspectionPending && <div><dt>Technician verification</dt><dd><StatusBadge tone="warning">PENDING</StatusBadge></dd></div>}
          </dl>
        </section>
      </div>

      {canShowHistory && <section className="abd-card abd-history" aria-labelledby="abd-history-title">
        <h2 id="abd-history-title"><ClipboardList size={17} aria-hidden="true" /> Replacement &amp; lifecycle history</h2>
        {related.length > 0 && <div className="abd-history-list">
          {related.map((request) => {
            const record = records.find((item) => item.requestId === request.id);
            const replacementId = record?.selectedBatteryId || record?.registeredBatteryId;
            const role = request.batteryId === battery.id ? 'Damaged battery' : 'Supplied replacement';
            const otherId = request.batteryId === battery.id ? replacementId : request.batteryId;
            return <div className="abd-history-entry" key={request.id}>
              <div className="abd-history-head">
                <Link className="abd-link" to={`/admin/replacement/requests?request=${encodeURIComponent(request.id)}`}>{request.id}<ExternalLink size={12} /></Link>
                <StatusBadge tone={getAdminEffectiveStatus(request) === 'RECEIVED' ? 'success' : getAdminEffectiveStatus(request) === 'REJECTED' ? 'danger' : 'warning'}>{getAdminEffectiveStatus(request).replace(/_/g, ' ')}</StatusBadge>
              </div>
              <div className="abd-history-meta"><span>{role}</span><span>Reported: {timeLabel(request.createdAt)}</span></div>
              {otherId && <div className="abd-history-related">
                {request.batteryId === battery.id ? 'Replacement battery: ' : 'Original battery: '}
                {getAdminBatteries().some((item) => item.id === otherId)
                  ? <Link className="abd-link" to={`/admin/network/batteries/${otherId}`}>{otherId}<ExternalLink size={12} /></Link>
                  : otherId}
              </div>}
            </div>;
          })}
        </div>}
        {battery.inspectionPending && <div className="abd-history-row"><span>Technician verification</span><strong>Pending confirmation</strong></div>}
        {battery.inspectionNote && <div className="abd-history-row"><span>Latest Technician report</span><strong>{battery.inspectionNote}</strong></div>}
        {battery.inspectionCheckedAt && <div className="abd-history-row"><span>Verification recorded at</span><strong>{timeLabel(battery.inspectionCheckedAt)}</strong></div>}
        {battery.retirementReason && <div className="abd-history-row"><span>Retirement / issue reason</span><strong>{issueReason(battery.retirementReason)}</strong></div>}
        {battery.retiredAt && <div className="abd-history-row"><span>Retired on</span><strong>{timeLabel(battery.retiredAt)}</strong></div>}
      </section>}
    </div>

    <Dialog open={retireOpen} onOpenChange={(open) => { if (!open) { setRetireOpen(false); setError(''); } }}>
      <DialogContent><div className="p-5">
        <DialogTitle className="text-lg font-semibold">Retire {battery.id}?</DialogTitle>
        <p className="mt-2 text-sm text-muted-foreground">Retirement removes this battery from operational availability. Its ID and history are preserved.</p>
        <label className="mt-4 block text-sm"><span>Reason for retirement <span className="text-red-500">*</span></span>
          <textarea required className="mt-2 w-full rounded-md border border-border bg-transparent p-3" rows={3}
            value={retireReason} onChange={(event) => setRetireReason(event.target.value)} placeholder="Enter reason..." />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
        <div className="form-actions mt-5">
          <ActionButton variant="secondary" onClick={() => { setRetireOpen(false); setError(''); }}>Cancel</ActionButton>
          <ActionButton variant="danger" disabled={!retireReason.trim()} onClick={retire}>Confirm retirement</ActionButton>
        </div>
      </div></DialogContent>
    </Dialog>
  </AdminPageShell>;
}
