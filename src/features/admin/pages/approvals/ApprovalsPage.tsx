import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Clock3, PackageCheck, Truck, CircleCheckBig, Ban } from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import './ReplacementRecordsDialog.css';
import { getAdminHubs, getAdminBatteries } from '../../services/adminStore';
import { getReplacementRequests, getSpareParts, type ReplacementRequest } from '../../services/prototypeWorkflow';
import {
  getAdminEffectiveStatus, getAdminSupplyRecord, getMatchingBatteryOptions,
  getMatchingPartOptions, getRequestDroneModel, rejectReplacementRequest, supplyApprovedReplacement,
  type AdminEffectiveStatus,
} from '../../services/adminReplacementSupply';

// Three supply stages plus Rejected as a terminal exception before supply.
const labels: Record<AdminEffectiveStatus, string> = {
  AWAITING_SUPPLY: 'Awaiting supply', SUPPLIED: 'Supplied', RECEIVED: 'Received',
  REJECTED: 'Rejected',
};
// Match the Technician Work Orders status presentation: colored text, no outlined badge.
// Rejected stays visible for both previous records and new Admin decisions.
const statusTextColors: Record<AdminEffectiveStatus, string> = {
  AWAITING_SUPPLY: 'text-orange-500',
  SUPPLIED: 'text-blue-500',
  RECEIVED: 'text-emerald-500',
  REJECTED: 'text-red-500',
};

function ReplacementStatusText({ status }: { status: AdminEffectiveStatus }) {
  return <span className={`whitespace-nowrap text-[13px] font-semibold ${statusTextColors[status]}`}>
    {labels[status]}
  </span>;
}
const time = (date?: string) => date ? new Date(date).toLocaleString('en-GB') : '—';
const adminDialogFont = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const selectClass = 'h-10 w-full min-w-0 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[13px] text-[var(--admin-text)] outline-none focus:border-[#FF6B00]';

function ReplacementMetric({ label, value, note, icon: Icon }: {
  label: string;
  value: number;
  note: string;
  icon: typeof Clock3;
}) {
  return <div className="min-w-0 px-4 py-3" style={{
    backgroundColor: '#FFFFFF', border: '1px solid #DDE2E8', borderRadius: 12,
    boxShadow: '0 8px 22px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.05)',
    minHeight: 112,
  }}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-[var(--admin-muted)]">{label}</span>
      <Icon size={18} strokeWidth={1.8} className="shrink-0 text-[#FF6B00]" aria-hidden="true" />
    </div>
    <strong className="mt-1 block text-2xl font-bold leading-tight text-[var(--admin-text)]">{value}</strong>
    <span className="mt-0.5 block text-[11px] text-[var(--admin-subtle)]">{note}</span>
  </div>;
}

function ReadOnlyFact({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 border-b border-[var(--admin-border)] py-2.5">
    <dt className="text-[12px] text-[var(--admin-muted)]">{label}</dt>
    <dd className="mt-1 break-words text-[13px] font-semibold text-[var(--admin-text)]">{value}</dd>
  </div>;
}

export function ApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [type, setType] = useState(params.get('type') ?? 'ALL');
  const [filter, setFilter] = useState('ALL');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1);
    window.addEventListener('admin-data-updated', refresh);
    return () => window.removeEventListener('admin-data-updated', refresh);
  }, []);

  const requests = useMemo(() => getReplacementRequests(), [version]);
  const parts = useMemo(() => getSpareParts(), [version]);
  const hubs = getAdminHubs();
  const batteries = getAdminBatteries();
  const requestId = params.get('request');
  const request = requests.find((item) => item.id === requestId);
  const status = request ? getAdminEffectiveStatus(request) : undefined;
  const supply = request ? getAdminSupplyRecord(request.id) : undefined;
  const matchedParts = request?.type === 'PART' ? getMatchingPartOptions(request) : [];
  const matchedBatteries = request?.type === 'BATTERY' ? getMatchingBatteryOptions(request) : [];
  const damagedBattery = request?.type === 'BATTERY' ? batteries.find((battery) => battery.id === request.batteryId) : undefined;
  const droneModel = request ? getRequestDroneModel(request) : undefined;
  const suggestedId = request?.type === 'PART'
    ? (matchedParts.find((part) => part.id === request.partId)?.id ?? (matchedParts.length === 1 ? matchedParts[0].id : ''))
    : matchedBatteries.length === 1 ? matchedBatteries[0].id : '';
  const chosenId = selectedItemId || suggestedId;
  const chosenPart = matchedParts.find((part) => part.id === chosenId);
  const canSupply = request?.type === 'BATTERY'
    ? matchedBatteries.some((battery) => battery.id === chosenId)
    : Boolean(chosenPart?.active && chosenPart.quantity >= (request?.quantity ?? 0));

  const item = (entry: ReplacementRequest) => entry.type === 'PART'
    ? parts.find((part) => part.id === entry.partId)?.name ?? entry.partId ?? 'Spare part'
    : `Battery ${entry.batteryId ?? '—'}`;
  const hubName = (id: string) => hubs.find((hub) => hub.id === id)?.name ?? id;
  const visible = requests.filter((entry) => {
    const state = getAdminEffectiveStatus(entry);
    return (type === 'ALL' || type === entry.type)
      && (filter === 'ALL' || filter === state)
      && `${entry.id} ${entry.technician} ${entry.droneId} ${entry.batteryId} ${entry.reason} ${item(entry)}`
        .toLowerCase().includes(query.trim().toLowerCase());
  });
  const count = (state: AdminEffectiveStatus) => requests.filter((entry) => getAdminEffectiveStatus(entry) === state).length;

  function openRequest(entry: ReplacementRequest) {
    const next = new URLSearchParams(params);
    next.set('request', entry.id);
    setParams(next);
    setSelectedItemId(''); setRejectMode(false); setRejectionReason(''); setError(''); setNotice('');
  }
  function closeRequest() {
    const next = new URLSearchParams(params);
    next.delete('request');
    setParams(next);
    setSelectedItemId(''); setRejectMode(false); setRejectionReason(''); setError('');
  }
  function confirmSupply() {
    if (!request || status !== 'AWAITING_SUPPLY' || !canSupply) return;
    try {
      supplyApprovedReplacement(request.id, chosenId);
      const message = `${request.id}: ${chosenId} supplied. Awaiting Technician receipt.`;
      closeRequest();
      setNotice(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to supply the replacement item.');
    }
  }

  function confirmReject() {
    if (!request || status !== 'AWAITING_SUPPLY' || !rejectMode) return;
    const reason = rejectionReason.trim();
    if (!reason) { setError('Enter a reason for rejection.'); return; }
    try {
      rejectReplacementRequest(request.id, reason);
      const message = `${request.id} rejected. No replacement item was supplied.`;
      closeRequest();
      setNotice(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reject this replacement.');
    }
  }

  const suppliedId = supply?.selectedPartId ?? supply?.selectedBatteryId ?? request?.approvedPartId ?? '—';
  const workOrderId = (request as (ReplacementRequest & { workOrderId?: string }) | undefined)?.workOrderId;

  return <AdminPageShell title="Replacement Records" description="Review reported replacement needs and confirm supply in one step.">
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <ReplacementMetric label="Awaiting supply" value={count('AWAITING_SUPPLY')} note="Admin confirmation needed" icon={PackageCheck} />
      <ReplacementMetric label="Supplied" value={count('SUPPLIED')} note="Awaiting Technician receipt" icon={Truck} />
      <ReplacementMetric label="Received" value={count('RECEIVED')} note="Technician confirmed receipt" icon={CircleCheckBig} />
    </div>
    {notice && <div role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-700">{notice}</div>}
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery}
        placeholder="Search request, damaged item or technician…"
        meta={`${visible.length} of ${requests.length} records`}
        filters={<>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="ALL">All types</option><option value="PART">Spare parts</option><option value="BATTERY">Batteries</option>
          </select>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="ALL">All status</option>
            {(Object.keys(labels) as AdminEffectiveStatus[]).map((state) => <option key={state} value={state}>{labels[state]}</option>)}
          </select>
        </>}
      />
      <div className="table-wrap"><table>
        <thead><tr><th>Request</th><th>Damaged item</th><th>Receiving Hub</th><th>Technician</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {visible.map((entry) => {
            const entryStatus = getAdminEffectiveStatus(entry);
            return <tr key={entry.id}>
              <td><strong>{entry.id}</strong><small>{time(entry.createdAt)}</small></td>
              <td><strong>{item(entry)}</strong><small>{entry.droneId ?? entry.batteryId ?? '—'}</small></td>
              <td>{hubName(entry.hubId)}</td><td>{entry.technician}</td><td>{entry.quantity}</td>
              <td><ReplacementStatusText status={entryStatus} /></td>
              <td><ActionButton variant="secondary" onClick={() => openRequest(entry)}>View details</ActionButton></td>
            </tr>;
          })}
          {visible.length === 0 && <tr><td colSpan={7} className="text-center">No matching replacement records.</td></tr>}
        </tbody>
      </table></div>
    </OperatorPanel>

    <Dialog open={Boolean(requestId)} onOpenChange={(open) => { if (!open) closeRequest(); }}>
      <DialogContent aria-describedby="replacement-detail-description"
        className="admin-replacement-dialog top-1/2 flex max-h-[calc(100dvh-32px)] w-[min(640px,calc(100%-30px))] -translate-y-1/2 flex-col overflow-hidden"
        style={{ fontFamily: adminDialogFont }}>
        {/* Header stays visible while the details scroll. */}
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">
          <div className="min-w-0">
            <DialogTitle asChild><div className="text-lg font-semibold leading-snug" style={{ fontFamily: adminDialogFont, fontSize: 18, fontWeight: 600 }}>
              {request ? `Replacement ${request.id}` : 'Replacement not found'}
            </div></DialogTitle>
            <p id="replacement-detail-description" className="mt-1 text-xs text-[var(--admin-muted)]">
              {request ? (rejectMode ? 'Confirm the reason before rejecting this replacement' : 'Reported replacement details and supply confirmation') : 'This record is no longer available.'}
            </p>
          </div>
          {status && <ReplacementStatusText status={status} />}
        </div>

        {/* The scrollbar is confined to the middle section, never the rounded dialog edge. */}
        <div key={`${requestId ?? "none"}-${rejectMode ? "reject" : "detail"}`} className="admin-replacement-dialog__body min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {request ? <div className="px-5 py-4">
            {rejectMode && status === 'AWAITING_SUPPLY' ? <div className="admin-replacement-dialog__rejection-form">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--admin-text)]">
                <Ban size={17} className="text-red-500" aria-hidden="true" /> Reject replacement
              </div>
              <p className="mb-4 text-[13px] leading-relaxed text-[var(--admin-muted)]">
                Review the reported issue and enter a reason. Rejecting closes this record without allocating a replacement item.
              </p>
              <div className="mb-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="font-semibold text-[var(--admin-text)]">{request.id}</span>
                  <span className="text-[var(--admin-muted)]">{request.type === 'PART' ? 'Spare part' : 'Battery'} · Qty {request.quantity}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--admin-text)]">{request.reason}</p>
              </div>
              <label htmlFor="replacement-rejection-reason" className="mb-2 block text-[13px] font-medium text-[var(--admin-text)]">
                Reason for rejection <span className="text-red-500" aria-label="required">*</span>
              </label>
              <textarea id="replacement-rejection-reason" value={rejectionReason} maxLength={500} rows={4}
                autoFocus placeholder="e.g. Duplicate report, incorrect component, or replacement not required after reinspection…"
                className="admin-replacement-dialog__reason" aria-required="true" aria-invalid={Boolean(error) && !rejectionReason.trim()}
                onChange={(event) => { setRejectionReason(event.target.value); setError(''); }} />
              {/* <div className="mt-1.5 flex items-start justify-between gap-3 text-[11px] text-[var(--admin-muted)]">
              <span>The reason will be saved with the replacement record.</span>
              <span className="shrink-0 tabular-nums">{rejectionReason.length}/500</span>
            </div> */}
            </div> : <>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--admin-text)]">
                <ClipboardList size={17} color="#FF6B00" aria-hidden="true" /> Reported issue
              </div>
              <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                <ReadOnlyFact label="Request ID" value={request.id} />
                <ReadOnlyFact label="Technician" value={request.technician} />
                <ReadOnlyFact label={request.type === 'PART' ? 'Drone ID' : 'Damaged Battery ID'} value={request.type === 'PART' ? request.droneId ?? '—' : request.batteryId ?? '—'} />
                <ReadOnlyFact label="Receiving Hub" value={hubName(request.hubId)} />
                <ReadOnlyFact label="Replacement item" value={request.type === 'PART' ? `${item(request)} · ${request.partId ?? '—'}` : damagedBattery?.model ?? 'Unknown battery model'} />
                <ReadOnlyFact label="Quantity" value={request.quantity} />
                {request.type === 'PART' && <ReadOnlyFact label="Drone model" value={droneModel ?? 'Unknown'} />}
                {workOrderId && <ReadOnlyFact label="Work Order" value={workOrderId} />}
                <ReadOnlyFact label="Reported at" value={time(request.createdAt)} />
              </dl>
              <div className="mt-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3">
                <div className="text-xs text-[var(--admin-muted)]">Reason for replacement</div>
                <p className="mt-1 text-sm leading-relaxed text-[var(--admin-text)]">{request.reason}</p>
              </div>

              {status === 'AWAITING_SUPPLY' && <div className="mt-5 border-t border-[var(--admin-border)] pt-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--admin-text)]">
                  <PackageCheck size={17} color="#FF6B00" aria-hidden="true" /> Confirm replacement supply
                </div>
                <label className="block text-xs font-medium text-[var(--admin-text-secondary)]" htmlFor="replacement-item-select">
                  {request.type === 'PART' ? 'Compatible spare part' : 'Available new battery'}
                </label>
                <select id="replacement-item-select" className={`${selectClass} mt-2`} value={chosenId}
                  onChange={(event) => { setSelectedItemId(event.target.value); setError(''); }}>
                  <option value="">Select a replacement item</option>
                  {request.type === 'PART' ? matchedParts.map((part) => <option key={part.id} value={part.id}>
                    {part.id} · {part.name} · Available {part.quantity}
                  </option>) : matchedBatteries.map((battery) => <option key={battery.id} value={battery.id}>
                    {battery.id} · {battery.model} · {battery.serialNumber}
                  </option>)}
                </select>
                {request.type === 'PART' && chosenPart && <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-[var(--admin-surface-2)] p-3 text-xs">
                  <div><span className="text-[var(--admin-muted)]">Available</span><p className="mt-1 font-semibold">{chosenPart.quantity}</p></div>
                  <div><span className="text-[var(--admin-muted)]">Required</span><p className="mt-1 font-semibold">{request.quantity}</p></div>
                  <div><span className="text-[var(--admin-muted)]">Remaining</span><p className="mt-1 font-semibold">{chosenPart.quantity >= request.quantity ? chosenPart.quantity - request.quantity : 'Insufficient'}</p></div>
                </div>}
                {!canSupply && <p className="mt-2 text-xs text-orange-600">
                  {request.type === 'PART' ? 'No compatible part with sufficient quantity. Add quantity in Spare Parts first.'
                    : 'No suitable unassigned battery selected. Register one in New Batteries first.'}
                </p>}
                {!canSupply && <div className="mt-2">
                  <Link className="text-button text-xs" onClick={closeRequest}
                    to={request.type === 'PART' ? '/admin/replacement/spare-parts'
                      : `/admin/replacement/new-batteries?model=${encodeURIComponent(damagedBattery?.model ?? '')}&returnTo=${encodeURIComponent(`/admin/replacement/requests?request=${request.id}`)}`}>
                    {request.type === 'PART' ? 'Manage spare parts' : 'Manage new batteries'}
                  </Link>
                </div>}
                <p className="mt-3 text-xs leading-relaxed text-[var(--admin-muted)]">
                  Confirm Supply allocates this item once. Technician confirms receipt separately.
                </p>
              </div>}

              {(status === 'SUPPLIED' || status === 'RECEIVED') && <div className="mt-5 border-t border-[var(--admin-border)] pt-4">
                <div className="mb-2 text-sm font-semibold">Supply information</div>
                <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                  <ReadOnlyFact label="Supplied item" value={suppliedId} />
                  <ReadOnlyFact label="Supplied at" value={time(supply?.suppliedAt ?? request.reviewedAt)} />
                  <ReadOnlyFact label="Receipt" value={status === 'RECEIVED' ? 'Confirmed by Technician' : 'Waiting for Technician'} />
                  {status === 'RECEIVED' && <ReadOnlyFact label="Received at" value={time(request.fulfilledAt)} />}
                </dl>
              </div>}
              {status === 'REJECTED' && <div className="mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3 text-[13px]">
                <div className="font-semibold text-red-600">Replacement rejected</div>
                {request.adminNote && <p className="mt-1 leading-relaxed text-[var(--admin-text)]">Reason: {request.adminNote}</p>}
                {request.reviewedAt && <p className="mt-1 text-xs text-[var(--admin-muted)]">{request.reviewedBy ?? 'Admin'} · {time(request.reviewedAt)}</p>}
              </div>}
            </>}
            {error && <p role="alert" className="mt-3 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}
          </div> : <p className="px-5 py-4 text-sm text-[var(--admin-muted)]">Close this dialog and choose another record.</p>}
        </div>

        {/* Separate the exception (Reject) from the normal Confirm Supply path. */}
        <div className="admin-replacement-dialog__footer shrink-0 border-t border-[var(--admin-border)] px-5 py-3.5">
          {request && status === 'AWAITING_SUPPLY' && !rejectMode && <button type="button"
            className="admin-replacement-dialog__reject-trigger" onClick={() => { setRejectMode(true); setRejectionReason(''); setError(''); }}>
            <Ban size={15} aria-hidden="true" /> Reject request
          </button>}
          <div className="admin-replacement-dialog__footer-actions">
            {rejectMode && status === 'AWAITING_SUPPLY' ? <>
              <ActionButton variant="secondary" onClick={() => { setRejectMode(false); setRejectionReason(''); setError(''); }}>Cancel</ActionButton>
              <ActionButton variant="danger" disabled={!rejectionReason.trim()} onClick={confirmReject}>Confirm Reject</ActionButton>
            </> : <>
              <ActionButton variant="secondary" onClick={closeRequest}>Close</ActionButton>
              {request && status === 'AWAITING_SUPPLY' && <ActionButton disabled={!canSupply} onClick={confirmSupply}>Confirm Supply</ActionButton>}
            </>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </AdminPageShell>;
}
