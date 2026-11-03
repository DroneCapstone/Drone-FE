import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, CheckCircle2, ChevronDown } from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { MetricCard } from '../../../operator/components/MetricCard';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { getAdminHubs, getAdminBatteries } from '../../services/adminStore';
import {
  getReplacementRequests, getSpareParts, type ReplacementRequest,
} from '../../services/prototypeWorkflow';
import {
  approveReplacementRequest, getAdminEffectiveStatus, getAdminSupplyRecord,
  getMatchingBatteryOptions, getMatchingPartOptions,
  getRequestDroneModel, rejectReplacementRequest, supplyApprovedReplacement,
  type AdminEffectiveStatus,
} from '../../services/adminReplacementSupply';

const labels: Record<AdminEffectiveStatus, string> = {
  PENDING: 'Pending review', AWAITING_SUPPLY: 'Awaiting supply',
  SUPPLIED: 'Supplied', RECEIVED: 'Received', REJECTED: 'Rejected',
};
const tones: Record<AdminEffectiveStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  PENDING: 'warning', AWAITING_SUPPLY: 'warning', SUPPLIED: 'info',
  RECEIVED: 'success', REJECTED: 'danger',
};
const time = (date?: string) => date ? new Date(date).toLocaleString('en-GB') : '—';

// Reuse Admin's compact 40px form-control visual language, including dark/light theme tokens.
const approvalFieldClass = 'w-full min-w-0 rounded-md border border-[var(--admin-border)] !bg-[var(--admin-surface-2)] px-3 text-[13px] text-[var(--admin-text)] shadow-none outline-none transition-colors focus:!border-[#ff6b00] focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60';

export function ApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [type, setType] = useState(params.get('type') ?? 'ALL');
  const [filter, setFilter] = useState('ALL');
  const [adminNote, setAdminNote] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');


  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    window.addEventListener('admin-data-updated', listener);
    return () => window.removeEventListener('admin-data-updated', listener);
  }, []);

  const requests = useMemo(() => getReplacementRequests(), [version]);
  const parts = useMemo(() => getSpareParts(), [version]);
  const hubs = getAdminHubs();
  const batteries = getAdminBatteries();
  const requestId = params.get('request');
  const request = requestId ? requests.find((item) => item.id === requestId) : undefined;
  const supply = request ? getAdminSupplyRecord(request.id) : undefined;
  const effective = request ? getAdminEffectiveStatus(request) : 'PENDING';
  const matchingParts = request?.type === 'PART' ? getMatchingPartOptions(request) : [];
  const matchingBatteries = request?.type === 'BATTERY' ? getMatchingBatteryOptions(request) : [];
  const selectedPart = matchingParts.find((part) => part.id === selectedItemId);
  const damagedPart = request?.type === 'PART' ? parts.find((part) => part.id === request.partId) : undefined;
  const damagedBattery = request?.type === 'BATTERY' ? batteries.find((battery) => battery.id === request.batteryId) : undefined;
  const droneModel = request ? getRequestDroneModel(request) : undefined;
  const availablePart = matchingParts.find((part) => part.id === selectedItemId);

  function openRequest(next: ReplacementRequest) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('request', next.id);
    setParams(nextParams);
    setAdminNote(''); setError(''); setNotice(''); setSelectedItemId('');
  }
  function back() {
    const nextParams = new URLSearchParams(params);
    nextParams.delete('request'); setParams(nextParams);
    setError(''); setNotice(''); setSelectedItemId('');
  }
  function run(action: () => void, message: string) {
    try { action(); setError(''); setNotice(message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to process this request.'); }
  }
  function approve() {
    if (!request) return;
    run(() => { approveReplacementRequest(request.id, adminNote); setSelectedItemId(''); },
      'Request approved.');
  }
  function reject() {
    if (!request) return;
    run(() => rejectReplacementRequest(request.id, adminNote), 'Request rejected with the recorded reason.');
  }
  function confirmSupply() {
    if (!request) return;
    const id = selectedItemId;
    run(() => supplyApprovedReplacement(request.id, id), `Supplied ${id}.`);
  }

  const item = (r: ReplacementRequest) => r.type === 'PART'
    ? parts.find((part) => part.id === r.partId)?.name ?? r.partId ?? 'Spare part'
    : `Battery ${r.batteryId ?? '—'}`;
  const hubName = (id: string) => hubs.find((h) => h.id === id)?.name ?? id;
  const visible = requests.filter((r) => {
    const status = getAdminEffectiveStatus(r);
    return (type === 'ALL' || type === r.type) && (filter === 'ALL' || filter === status)
      && `${r.id} ${r.technician} ${r.droneId} ${r.batteryId} ${r.reason} ${item(r)}`.toLowerCase().includes(query.toLowerCase());
  });

  if (requestId) {
    if (!request) return <AdminPageShell title="Replacement request" description="Request not found">
      <ActionButton variant="secondary" onClick={back}>Back to approvals</ActionButton>
    </AdminPageShell>;
    const previouslySelected = supply?.selectedPartId ?? supply?.selectedBatteryId ?? request.approvedPartId;
    const canSupply = request.type === 'BATTERY'
      ? matchingBatteries.some((battery) => battery.id === selectedItemId)
      : Boolean(selectedItemId && availablePart && availablePart.quantity >= request.quantity);
    const workOrderId = (request as ReplacementRequest & { workOrderId?: string }).workOrderId;

    return <AdminPageShell title={`Request ${request.id}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button type="button" className="text-button inline-flex items-center gap-2" onClick={back}>
          <ArrowLeft size={16} /> Back to approvals
        </button>
        <StatusBadge tone={tones[effective]}>{labels[effective]}</StatusBadge>
      </div>
      {notice && <p role="status" className="mb-3 rounded-md border border-emerald-200 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      {/* Shared two-card layout for ALL request statuses. */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <OperatorPanel>
          <div className="mb-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ClipboardList size={18} color="#FF6B00"/> Technician's reported issue
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Reported by <strong className="text-foreground">{request.technician}</strong></p>
          </div>
          <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <div className="min-w-0 border-b border-border py-2">
              <dt className="text-xs text-muted-foreground">Request</dt>
              <dd className="mt-1 break-words text-sm font-semibold">{request.id}</dd>
            </div>
            <div className="min-w-0 border-b border-border py-2">
              <dt className="text-xs text-muted-foreground">{request.type === 'PART' ? 'Drone' : 'Battery'}</dt>
              <dd className="mt-1 break-words text-sm font-semibold">{request.type === 'PART' ? request.droneId ?? '—' : request.batteryId ?? '—'}</dd>
            </div>
            <div className="min-w-0 border-b border-border py-2">
              <dt className="text-xs text-muted-foreground">{request.type === 'PART' ? 'Component' : 'Battery model'}</dt>
              <dd className="mt-1 break-words text-sm font-semibold">{request.type === 'PART' ? `${item(request)} · ${request.partId ?? '—'}` : damagedBattery?.model ?? 'Unknown'}</dd>
            </div>
            <div className="min-w-0 border-b border-border py-2">
              <dt className="text-xs text-muted-foreground">Quantity</dt>
              <dd className="mt-1 text-sm font-semibold">{request.quantity}</dd>
            </div>
            {request.type === 'PART' && <div className="min-w-0 border-b border-border py-2">
              <dt className="text-xs text-muted-foreground">Drone model</dt>
              <dd className="mt-1 break-words text-sm font-semibold">{droneModel ?? 'Unknown'}</dd>
            </div>}
            <div className="min-w-0 border-b border-border py-2">
              <dt className="text-xs text-muted-foreground">Receiving Hub</dt>
              <dd className="mt-1 break-words text-sm font-semibold">{hubName(request.hubId)}</dd>
            </div>
            <div className="min-w-0 border-b border-border py-2">
              <dt className="text-xs text-muted-foreground">Requested at</dt>
              <dd className="mt-1 break-words text-sm font-semibold">{time(request.createdAt)}</dd>
            </div>
            {workOrderId && <div className="min-w-0 border-b border-border py-2">
              <dt className="text-xs text-muted-foreground">Work order</dt>
              <dd className="mt-1 break-words text-sm font-semibold">{workOrderId}</dd>
            </div>}
          </dl>
          <div className="mt-3 rounded-lg border border-border px-3 py-3">
            <p className="text-xs text-muted-foreground">Reported damage</p>
            <p className="mt-1 text-sm font-medium leading-relaxed">{request.reason}</p>
          </div>
        </OperatorPanel>

        <OperatorPanel>
          <h2 className="mb-3 text-base font-semibold">{effective === 'PENDING' ? 'Approval decision' : effective === 'AWAITING_SUPPLY' ? 'Replacement supply' : effective === 'REJECTED' ? 'Rejection details' : 'Supply details'}</h2>
          {effective === 'PENDING' && <>
            <label className="block text-sm">
              <span>Review findings and notes</span>
              <textarea rows={3} className={`${approvalFieldClass} mt-2 min-h-[92px] resize-y py-2.5`} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Add a note (required for rejection)…"/>
            </label>
            <div className="form-actions mt-4">
              <ActionButton variant="danger" onClick={reject}>Reject</ActionButton>
              <ActionButton onClick={approve}>Approve</ActionButton>
            </div>
          </>}

          {effective === 'AWAITING_SUPPLY' && <>
            {request.type === 'PART' ? <>
              <label className="block text-sm">
                <span className="text-[13px] text-[var(--admin-text-secondary)]">Compatible spare part</span>
                <span className="relative mt-2 block">
                  <select
                    aria-label="Compatible spare part"
                    className={`${approvalFieldClass} h-10 appearance-none pr-10`}
                    value={selectedItemId}
                    onChange={(event) => { setSelectedItemId(event.target.value); setError(''); }}
                  >
                    <option value="">Select a spare part</option>
                    {matchingParts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.id} · {part.name} · Qty {part.quantity}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]"
                  />
                </span>
              </label>
              {selectedPart && <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-[var(--admin-surface-2)] px-3 py-2 text-xs">
                <div><span className="text-muted-foreground">Available</span><p className="mt-1 font-semibold">{selectedPart.quantity}</p></div>
                <div><span className="text-muted-foreground">Required</span><p className="mt-1 font-semibold">{request.quantity}</p></div>
                <div><span className="text-muted-foreground">After</span><p className="mt-1 font-semibold">{selectedPart.quantity >= request.quantity ? selectedPart.quantity - request.quantity : 'Insufficient'}</p></div>
              </div>}
              {!matchingParts.length && <p className="mt-2 text-xs text-orange-600">No compatible spare part registered.</p>}
              {selectedPart && selectedPart.quantity < request.quantity && <p className="mt-2 text-xs text-orange-600">Not enough quantity. Add more in Spare Parts before confirming.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="button button-secondary" to="/admin/replacement/spare-parts">Manage spare parts</Link>
              </div>
            </> : <>
              {damagedBattery ? <>
                <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Battery model</p><p className="mt-1 font-semibold">{damagedBattery.model}</p></div>
                  <div><p className="text-xs text-muted-foreground">Receiving Hub</p><p className="mt-1 font-semibold">{hubName(request.hubId)}</p></div>
                </div>
                <label className="block text-sm">
                  <span className="text-[13px] text-[var(--admin-text-secondary)]">Available new battery</span>
                  <span className="relative mt-2 block">
                    <select aria-label="Available new battery" className={`${approvalFieldClass} h-10 appearance-none pr-10`}
                      value={selectedItemId} onChange={(event) => { setSelectedItemId(event.target.value); setError(''); }}>
                      <option value="">Select a new battery</option>
                      {matchingBatteries.map((battery) => <option key={battery.id} value={battery.id}>
                        {battery.id} · {battery.model} · {battery.serialNumber}
                      </option>)}
                    </select>
                    <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]" />
                  </span>
                </label>
                {!matchingBatteries.length && <p className="mt-2 text-xs text-orange-600">No new battery available for this model.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="button button-secondary" to={`/admin/replacement/new-batteries?model=${encodeURIComponent(damagedBattery.model)}&returnTo=${encodeURIComponent(`/admin/replacement/requests?request=${request.id}`)}`}>
                    Register / view new batteries
                  </Link>
                </div>
              </> : <p className="text-sm text-red-500">Damaged battery not found.</p>}
            </>}
            <div className="mt-4 flex justify-end border-t border-border pt-3">
              <ActionButton disabled={!canSupply} onClick={confirmSupply}><CheckCircle2 size={16}/> Confirm supply</ActionButton>
            </div>
          </>}

          {(effective === 'SUPPLIED' || effective === 'RECEIVED') && <>
            <h3 className="mb-3 text-sm font-medium">Supply details</h3>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Provided</dt><dd className="mt-1 break-words font-semibold">{previouslySelected ?? 'Not recorded'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Quantity</dt><dd className="mt-1 font-semibold">{request.quantity}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Supplied at</dt><dd className="mt-1 font-semibold">{time(supply?.suppliedAt ?? request.reviewedAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Receipt</dt><dd className="mt-1 font-semibold">{effective === 'RECEIVED' ? 'Confirmed' : 'Pending'}</dd></div>
            </dl>
          </>}

          {effective === 'REJECTED' && <>
            <h3 className="mb-2 text-sm font-medium">Rejection reason</h3>
            <p className="rounded-md border border-border px-3 py-3 text-sm">{request.adminNote || 'No reason recorded.'}</p>
          </>}
        </OperatorPanel>
      </div>
      {error && <p role="alert" className="mt-3 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}

    </AdminPageShell>;
  }

  const count = (state: AdminEffectiveStatus) => requests.filter((r) => getAdminEffectiveStatus(r) === state).length;
  return <AdminPageShell title="Requests & Approvals">
    <div className="metric-grid">
      <MetricCard label="Pending" value={String(count('PENDING'))} delta="Review" tone="warning" note="Waiting for Admin decision"/>
      <MetricCard label="Approved" value={String(count('AWAITING_SUPPLY'))} delta="Supply needed" tone="info" note="Choose a replacement item"/>
      <MetricCard label="Supplied" value={String(count('SUPPLIED'))} delta="Technician" tone="info" note="Awaiting receipt"/>
      <MetricCard label="Received" value={String(count('RECEIVED'))} delta="Confirmed" tone="success" note="Technician confirmed receipt"/>
    </div>
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search request, damaged item or technician…" meta={`${visible.length} of ${requests.length} requests`} filters={<>
        <select value={type} onChange={(e)=>setType(e.target.value)}><option value="ALL">All requests</option><option value="PART">Spare parts</option><option value="BATTERY">Batteries</option></select>
        <select value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="ALL">All status</option>{(Object.keys(labels) as AdminEffectiveStatus[]).map((state)=><option key={state} value={state}>{labels[state]}</option>)}</select>
      </>}/>
      <div className="table-wrap"><table><thead><tr><th>Request</th><th>Damaged item</th><th>Receiving Hub</th><th>Technician</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{visible.map((r) => {const state=getAdminEffectiveStatus(r); return <tr key={r.id}>
          <td><strong>{r.id}</strong><small>{time(r.createdAt)}</small></td>
          <td><strong>{item(r)}</strong><small>{r.droneId ?? r.batteryId ?? '—'}</small></td>
          <td>{hubName(r.hubId)}</td><td>{r.technician}</td><td>{r.quantity}</td>
          <td><StatusBadge tone={tones[state]}>{labels[state]}</StatusBadge></td>
          <td><ActionButton variant="secondary" onClick={()=>openRequest(r)}>View details</ActionButton></td>
        </tr>})}
        {!visible.length && <tr><td colSpan={7} className="text-center">No matching requests.</td></tr>}
        </tbody>
      </table></div>
    </OperatorPanel>
  </AdminPageShell>;
}
