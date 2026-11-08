import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Ban, ChevronDown, CircleCheckBig, ClipboardList, Clock3, PackageCheck, Truck,
} from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { getAdminBatteries, getAdminHubs } from '../../services/adminStore';
import {
  getReplacementRequests, getSpareParts, type ReplacementRequest,
} from '../../services/prototypeWorkflow';
import {
  approveReplacementRequest, getAdminEffectiveStatus, getAdminSupplyRecord,
  getMatchingBatteryOptions, getMatchingPartOptions, getRequestDroneModel,
  rejectReplacementRequest, supplyApprovedReplacement, type AdminEffectiveStatus,
} from '../../services/adminReplacementSupply';

const labels: Record<AdminEffectiveStatus, string> = {
  PENDING: 'Pending review',
  AWAITING_SUPPLY: 'Awaiting supply',
  SUPPLIED: 'Supplied',
  RECEIVED: 'Received (historic)',
  REJECTED: 'Rejected',
};
const tones: Record<AdminEffectiveStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  PENDING: 'warning', AWAITING_SUPPLY: 'warning', SUPPLIED: 'info',
  RECEIVED: 'success', REJECTED: 'danger',
};
const time = (date?: string) => date ? new Date(date).toLocaleString('en-GB') : '—';
const selectClass = 'w-full min-w-0 rounded-md border border-[var(--admin-border)] !bg-[var(--admin-surface-2)] px-3 py-2.5 text-[13px] text-[var(--admin-text)] outline-none focus:!border-[#ff6b00]';

type MetricIcon = typeof Clock3;
function ReplacementMetric({ label, value, note, icon: Icon }: {
  label: string; value: number; note: string; icon: MetricIcon;
}) {
  return <div className="min-w-0 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-[var(--admin-muted)]">{label}</span>
      <Icon size={18} color="#FF6B00" aria-hidden="true" />
    </div>
    <strong className="mt-1 block text-2xl font-bold text-[var(--admin-text)]">{value}</strong>
    <span className="mt-0.5 block text-[11px] text-[var(--admin-muted)]">{note}</span>
  </div>;
}
function ReadOnlyFact({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 border-b border-[var(--admin-border)] py-2">
    <dt className="text-xs text-[var(--admin-muted)]">{label}</dt>
    <dd className="mt-1 break-words text-[13px] font-medium text-[var(--admin-text)]">{value}</dd>
  </div>;
}

export function ApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [type, setType] = useState(params.get('type') ?? 'ALL');
  const [filter, setFilter] = useState('ALL');
  const [adminNote, setAdminNote] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const listener = () => setVersion((current) => current + 1);
    window.addEventListener('admin-data-updated', listener);
    return () => window.removeEventListener('admin-data-updated', listener);
  }, []);

  const requests = useMemo(() => getReplacementRequests(), [version]);
  const parts = useMemo(() => getSpareParts(), [version]);
  const hubs = getAdminHubs();
  const batteries = getAdminBatteries();
  const requestId = params.get('request');
  const request = requestId ? requests.find((entry) => entry.id === requestId) : undefined;
  const status = request ? getAdminEffectiveStatus(request) : undefined;
  const supply = request ? getAdminSupplyRecord(request.id) : undefined;
  const matchedParts = request?.type === 'PART' ? getMatchingPartOptions(request) : [];
  const matchedBatteries = request?.type === 'BATTERY' ? getMatchingBatteryOptions(request) : [];
  const chosenPart = matchedParts.find((part) => part.id === selectedItemId);
  const damagedBattery = request?.type === 'BATTERY'
    ? batteries.find((battery) => battery.id === request.batteryId) : undefined;
  const droneModel = request ? getRequestDroneModel(request) : undefined;
  const canSupply = status === 'AWAITING_SUPPLY' && Boolean(request) && (
    request?.type === 'PART'
      ? Boolean(chosenPart?.active && chosenPart.quantity >= request.quantity)
      : matchedBatteries.some((battery) => battery.id === selectedItemId)
  );
  const suppliedId = supply?.selectedPartId ?? supply?.selectedBatteryId ?? request?.approvedPartId ?? '—';
  const workOrderId = (request as (ReplacementRequest & { workOrderId?: string }) | undefined)?.workOrderId;

  const item = (entry: ReplacementRequest) => entry.type === 'PART'
    ? parts.find((part) => part.id === entry.partId)?.name ?? entry.partId ?? 'Spare part'
    : `Battery ${entry.batteryId ?? '—'}`;
  const hubName = (id: string) => hubs.find((hub) => hub.id === id)?.name ?? id;
  const visible = requests.filter((entry) => {
    const state = getAdminEffectiveStatus(entry);
    return (type === 'ALL' || type === entry.type)
      && (filter === 'ALL' || filter === state)
      && `${entry.id} ${entry.technician} ${entry.droneId} ${entry.batteryId} ${entry.reason} ${item(entry)}`
        .toLowerCase().includes(query.toLowerCase());
  });
  const count = (state: AdminEffectiveStatus) => requests.filter((entry) => getAdminEffectiveStatus(entry) === state).length;

  function openRequest(entry: ReplacementRequest) {
    const next = new URLSearchParams(params);
    next.set('request', entry.id);
    setParams(next);
    setSelectedItemId('');
    setAdminNote('');
    setRejectionReason('');
    setRejectMode(false);
    setError('');
    setNotice('');
  }
  function closeRequest() {
    const next = new URLSearchParams(params);
    next.delete('request');
    setParams(next);
    setSelectedItemId('');
    setRejectMode(false);
    setRejectionReason('');
    setError('');
  }
  function approve() {
    if (!request || status !== 'PENDING') return;
    try {
      approveReplacementRequest(request.id, adminNote);
      setError('');
      setSelectedItemId('');
      setNotice(`${request.id} approved. Select a replacement item to confirm supply.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to approve the request.');
    }
  }
  function confirmReject() {
    if (!request || status !== 'PENDING') return;
    if (!rejectionReason.trim()) { setError('A reason for rejection is required.'); return; }
    try {
      rejectReplacementRequest(request.id, rejectionReason);
      closeRequest();
      setNotice(`${request.id} rejected with the recorded reason.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reject the request.');
    }
  }
  function confirmSupply() {
    if (!request || !canSupply || status !== 'AWAITING_SUPPLY') return;
    try {
      supplyApprovedReplacement(request.id, selectedItemId);
      closeRequest();
      setNotice(`${request.id}: ${selectedItemId} supplied. The replacement is ready for the Technician workflow.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to supply the replacement item.');
    }
  }

  return <AdminPageShell title="Replacement Records" description="Review reported replacements and supply compatible parts or batteries.">
    {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <ReplacementMetric label="Pending review" value={count('PENDING')} note="Admin decision needed" icon={Clock3} />
      <ReplacementMetric label="Awaiting supply" value={count('AWAITING_SUPPLY')} note="Item selection needed" icon={PackageCheck} />
      <ReplacementMetric label="Supplied" value={count('SUPPLIED')} note="Issued to Technician" icon={Truck} />
      <ReplacementMetric label="Received" value={count('RECEIVED')} note="Historic receipts" icon={CircleCheckBig} />
      <ReplacementMetric label="Rejected" value={count('REJECTED')} note="Closed without supply" icon={Ban} />
    </div>

    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery}
        placeholder="Search request, damaged item or technician…"
        meta={`${visible.length} of ${requests.length} requests`}
        filters={<>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="ALL">All requests</option><option value="PART">Spare parts</option>
            <option value="BATTERY">Batteries</option>
          </select>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            {(Object.keys(labels) as AdminEffectiveStatus[]).map((state) =>
              <option key={state} value={state}>{labels[state]}</option>)}
          </select>
        </>} />
      <div className="table-wrap"><table>
        <thead><tr><th>Request</th><th>Damaged item</th><th>Receiving Hub</th>
          <th>Technician</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {visible.map((entry) => {
            const state = getAdminEffectiveStatus(entry);
            return <tr key={entry.id}>
              <td><strong>{entry.id}</strong><small>{time(entry.createdAt)}</small></td>
              <td><strong>{item(entry)}</strong><small>{entry.droneId ?? entry.batteryId ?? '—'}</small></td>
              <td>{hubName(entry.hubId)}</td><td>{entry.technician}</td>
              <td>{entry.quantity}</td>
              <td><StatusBadge tone={tones[state]}>{labels[state]}</StatusBadge></td>
              <td><ActionButton variant="secondary" onClick={() => openRequest(entry)}>View details</ActionButton></td>
            </tr>;
          })}
          {!visible.length && <tr><td colSpan={7} className="text-center">No matching requests.</td></tr>}
        </tbody>
      </table></div>
    </OperatorPanel>

    <Dialog open={Boolean(requestId)} onOpenChange={(open) => { if (!open) closeRequest(); }}>
      <DialogContent aria-describedby="replacement-detail-description"
        className="admin-replacement-dialog flex max-h-[calc(100dvh-32px)] w-[min(640px,calc(100%-30px))] flex-col overflow-hidden">
        <div className="shrink-0 border-b border-[var(--admin-border)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-lg font-semibold">
              {request ? `Replacement ${request.id}` : 'Replacement not found'}
            </DialogTitle>
            {status && <StatusBadge tone={tones[status]}>{labels[status]}</StatusBadge>}
          </div>
          <p id="replacement-detail-description" className="mt-1 text-xs text-[var(--admin-muted)]">
            {rejectMode ? 'Record a reason before rejecting the request.' : 'Reported issue and replacement supply details.'}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {request ? <>
            {rejectMode && status === 'PENDING' ? <>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Ban size={16} color="#dc2626" /> Reject replacement</div>
              <p className="mb-3 text-sm text-[var(--admin-muted)]">{request.reason}</p>
              <label htmlFor="replacement-rejection-reason" className="mb-2 block text-sm font-medium">Reason for rejection *</label>
              <textarea id="replacement-rejection-reason" rows={4} maxLength={500} autoFocus
                className={`${selectClass} w-full`} value={rejectionReason}
                placeholder="Explain why this replacement is rejected…"
                onChange={(event) => { setRejectionReason(event.target.value); setError(''); }} />
              <p className="mt-1 text-right text-xs text-[var(--admin-muted)]">{rejectionReason.length}/500</p>
            </> : <>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--admin-text)]">
                <ClipboardList size={17} color="#FF6B00" aria-hidden="true" /> Reported issue
              </div>
              <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                <ReadOnlyFact label="Request ID" value={request.id} />
                <ReadOnlyFact label="Technician" value={request.technician} />
                <ReadOnlyFact label={request.type === 'PART' ? 'Drone ID' : 'Damaged Battery ID'}
                  value={request.type === 'PART' ? request.droneId ?? '—' : request.batteryId ?? '—'} />
                <ReadOnlyFact label="Receiving Hub" value={hubName(request.hubId)} />
                <ReadOnlyFact label="Replacement item" value={request.type === 'PART'
                  ? `${item(request)} · ${request.partId ?? '—'}` : damagedBattery?.model ?? 'Unknown battery model'} />
                <ReadOnlyFact label="Quantity" value={request.quantity} />
                {request.type === 'PART' && <ReadOnlyFact label="Drone model" value={droneModel ?? 'Unknown'} />}
                {workOrderId && <ReadOnlyFact label="Work Order" value={workOrderId} />}
                <ReadOnlyFact label="Requested at" value={time(request.createdAt)} />
              </dl>
              <div className="mt-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3">
                <span className="text-xs text-[var(--admin-muted)]">Reported damage</span>
                <p className="mt-1 text-sm leading-relaxed">{request.reason}</p>
              </div>

              {status === 'PENDING' && <div className="mt-4 border-t border-[var(--admin-border)] pt-4">
                <h3 className="mb-3 text-sm font-semibold">Admin approval decision</h3>
                <label className="block text-sm">
                  <span>Review findings and notes</span>
                  <textarea rows={3} className={`${selectClass} mt-2 w-full`} value={adminNote}
                    placeholder="Add review notes (optional for approval)…"
                    onChange={(event) => setAdminNote(event.target.value)} />
                </label>
                <p className="mt-2 text-xs text-[var(--admin-muted)]">Approval does not deduct stock. Select an item in the next step.</p>
              </div>}

              {status === 'AWAITING_SUPPLY' && <div className="mt-4 border-t border-[var(--admin-border)] pt-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <PackageCheck size={17} color="#FF6B00" /> Confirm replacement supply
                </div>
                <label htmlFor="replacement-item-select" className="block text-xs font-medium">
                  {request.type === 'PART' ? 'Compatible spare part' : 'Available new battery'}
                </label>
                <div className="relative mt-2">
                  <select id="replacement-item-select" className={`${selectClass} appearance-none pr-9`}
                    value={selectedItemId} onChange={(event) => { setSelectedItemId(event.target.value); setError(''); }}>
                    <option value="">Select a replacement item</option>
                    {request.type === 'PART' ? matchedParts.map((part) =>
                      <option key={part.id} value={part.id}>{part.id} · {part.name} · Available {part.quantity}</option>)
                      : matchedBatteries.map((battery) =>
                        <option key={battery.id} value={battery.id}>{battery.id} · {battery.model} · {battery.serialNumber}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                {chosenPart && request.type === 'PART' && <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-[var(--admin-surface-2)] p-3 text-xs">
                  <div>Available<strong className="mt-1 block">{chosenPart.quantity}</strong></div>
                  <div>Required<strong className="mt-1 block">{request.quantity}</strong></div>
                  <div>Remaining<strong className="mt-1 block">{chosenPart.quantity >= request.quantity
                    ? chosenPart.quantity - request.quantity : 'Insufficient'}</strong></div>
                </div>}
                {!canSupply && <p className="mt-2 text-xs text-orange-600">
                  {request.type === 'PART' ? 'Select a compatible part with sufficient quantity.'
                    : 'Select an available unassigned battery of the required model.'}
                </p>}
                <div className="mt-3">
                  <Link className="text-button text-xs" onClick={closeRequest}
                    to={request.type === 'PART' ? '/admin/replacement/spare-parts'
                      : `/admin/replacement/new-batteries?model=${encodeURIComponent(damagedBattery?.model ?? '')}&returnTo=${encodeURIComponent(`/admin/approvals?request=${request.id}`)}`}>
                    {request.type === 'PART' ? 'Manage spare parts' : 'Manage new batteries'}
                  </Link>
                </div>
              </div>}

              {(status === 'SUPPLIED' || status === 'RECEIVED') && <div className="mt-4 border-t border-[var(--admin-border)] pt-4">
                <h3 className="mb-3 text-sm font-semibold">Supply details</h3>
                <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                  <ReadOnlyFact label="Supplied item" value={suppliedId} />
                  <ReadOnlyFact label="Supplied at" value={time(supply?.suppliedAt ?? request.reviewedAt)} />
                  <ReadOnlyFact label="Receipt" value={status === 'RECEIVED' ? 'Confirmed' : 'Pending in original workflow'} />
                  {status === 'RECEIVED' && <ReadOnlyFact label="Received at" value={time(request.fulfilledAt)} />}
                </dl>
              </div>}
              {status === 'REJECTED' && <div className="mt-4 rounded-lg border border-red-100 p-3 text-sm">
                <strong className="text-red-600">Replacement rejected</strong>
                <p className="mt-1">{request.adminNote || 'No reason recorded.'}</p>
              </div>}
            </>}
            {error && <p role="alert" className="mt-3 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}
          </> : <p className="text-sm text-[var(--admin-muted)]">This request is no longer available.</p>}
        </div>
        <div className="shrink-0 border-t border-[var(--admin-border)] px-5 py-3.5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {request && status === 'PENDING' && rejectMode ? <>
              <ActionButton variant="secondary" onClick={() => { setRejectMode(false); setError(''); }}>Cancel</ActionButton>
              <ActionButton variant="danger" disabled={!rejectionReason.trim()} onClick={confirmReject}>Confirm Reject</ActionButton>
            </> : <>
              {request && status === 'PENDING' && <>
                <ActionButton variant="danger" onClick={() => { setRejectMode(true); setError(''); }}>Reject</ActionButton>
                <ActionButton onClick={approve}>Approve</ActionButton>
              </>}
              {request && status === 'AWAITING_SUPPLY' && <ActionButton disabled={!canSupply} onClick={confirmSupply}>Confirm Supply</ActionButton>}
              <ActionButton variant="secondary" onClick={closeRequest}>Close</ActionButton>
            </>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </AdminPageShell>;
}
