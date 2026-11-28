import { AdminSummaryCard as ReplacementMetric } from "../../components/AdminSummaryCard";
import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../operator/components/OperatorTable";
import { useAdminConfirm } from '../../components/AdminConfirmDialog';
import { AdminSelect } from '../../components/AdminSelect';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useMemo, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { ClipboardList, PackageCheck, Truck, CircleCheckBig, Ban } from 'lucide-react';

import { ActionButton } from '../../../../components/ui/ActionButton';

import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';

import { OperatorPanel } from '../../../operator/components/OperatorPanel';

import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';

import { AdminPageShell } from '../../components/AdminPageShell';

import { AdminToolbar } from '../../components/AdminToolbar';

import './ReplacementRecordsDialog.css';

import {
  adminOperationsApi, apiError,
  type BatteryApi, type HubApi, type PartCategoryApi,
  type ReplacementRequestApi, type StockApi,
} from '../../api/adminOperationsApi';
// Legacy getReplacementRequests(), getAdminSupplyRecords() and localStorage demo stock
// are intentionally not imported. Replacement Records reads/writes Backend only.
type AdminEffectiveStatus = 'AWAITING_SUPPLY' | 'SUPPLIED' | 'RECEIVED' | 'REJECTED';
type ReplacementRequest = {
  id: string; type: 'PART' | 'BATTERY'; hubId: string; droneId?: string;
  batteryId?: string; partId?: string; approvedPartId?: string; quantity: number;
  reason: string; technician: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
  createdAt: string; reviewedAt?: string; reviewedBy?: string;
  adminNote?: string; fulfilledAt?: string;
};

// Map Backend data to the original Replacement Records view model; do not persist prototype stock.
function viewRequest(item: ReplacementRequestApi): ReplacementRequest {
  const current = item.status.toUpperCase();
  return {
    id: String(item.request_id), type: item.type.toUpperCase() === 'BATTERY' ? 'BATTERY' : 'PART', hubId: String(item.hub_id),
    batteryId: item.type === 'BATTERY' ? item.damaged_item_id ?? undefined : undefined,
    partId: item.type === 'PART' && item.part_category_id != null ? `PART-${item.part_category_id}` : undefined,
    quantity: item.quantity, reason: item.reason, technician: item.requested_by,
    status: current === 'REJECTED' ? 'REJECTED' : current === 'RECEIVED' || current === 'FULFILLED' ? 'FULFILLED' : current === 'SUPPLIED' || current === 'APPROVED' ? 'APPROVED' : 'PENDING',
    createdAt: item.created_at, reviewedAt: item.reviewed_at ?? undefined,
    adminNote: item.rejection_reason ?? undefined, fulfilledAt: undefined, // ReplacementRequestOut has no received_at; do not invent it.
    approvedPartId: item.supplied_item_id ?? undefined,
  };
}
function effectiveStatus(item: ReplacementRequest): AdminEffectiveStatus {
  if (item.status === 'REJECTED') return 'REJECTED';
  if (item.status === 'FULFILLED') return 'RECEIVED';
  if (item.status === 'APPROVED') return 'SUPPLIED';
  return 'AWAITING_SUPPLY';
}

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


function ReadOnlyFact({ label, value }: { label: string; value: string | number }) {

  return <div className="min-w-0 border-b border-[var(--admin-border)] py-2.5">

    <dt className="text-[12px] text-[var(--admin-muted)]">{label}</dt>

    <dd className="mt-1 break-words text-[13px] font-semibold text-[var(--admin-text)]">{value}</dd>

  </div>;

}

export function ApprovalsPage() {
  const confirmAction = useAdminConfirm();

  const [params, setParams] = useSearchParams();

  const [raw, setRaw] = useState<ReplacementRequestApi[]>([]);
  const [requestDetail, setRequestDetail] = useState<ReplacementRequestApi | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [categoryRows, setCategoryRows] = useState<PartCategoryApi[]>([]);
  const [stockRows, setStockRows] = useState<StockApi[]>([]);
  const [hubs, setHubs] = useState<HubApi[]>([]);
  const [batteries, setBatteries] = useState<BatteryApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState(params.get('type') ?? 'ALL');
  const [filter, setFilter] = useState('ALL');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    setLoading(true);
    // The replacement list is independent of inventory/model lookups. A failed lookup must
    // not make all requests disappear; supply stays unavailable when required stock is unknown.
    const [rr, cc, ss, hh, bb] = await Promise.allSettled([
      adminOperationsApi.replacementRequests(), adminOperationsApi.categories(),
      adminOperationsApi.stocks(), adminOperationsApi.hubs(), adminOperationsApi.batteries(),
    ]);
    if (rr.status === 'fulfilled') setRaw(rr.value);
    else setRaw([]);
    setCategoryRows(cc.status === 'fulfilled' ? cc.value : []);
    setStockRows(ss.status === 'fulfilled' ? ss.value : []);
    setHubs(hh.status === 'fulfilled' ? hh.value : []);
    setBatteries(bb.status === 'fulfilled' ? bb.value : []);
    const failures = [
      rr.status === 'rejected' ? `Replacement requests: ${apiError(rr.reason)}` : null,
      cc.status === 'rejected' ? `Spare part catalog: ${apiError(cc.reason)}` : null,
      ss.status === 'rejected' ? `Hub stock: ${apiError(ss.reason)}` : null,
      hh.status === 'rejected' ? `Hubs: ${apiError(hh.reason)}` : null,
      bb.status === 'rejected' ? `Batteries: ${apiError(bb.reason)}` : null,
    ].filter(Boolean);
    setError(failures.join(' · ')); setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);
  const requests = useMemo(() => raw.map(viewRequest), [raw]);
  const requestId = params.get('request');
  useEffect(() => {
    setRequestDetail(null);
    if (!requestId) return;
    let current = true;
    setDetailLoading(true);
    void adminOperationsApi.replacementRequest(Number(requestId))
      .then(detail => { if (current) { setRequestDetail(detail); setError(''); } })
      .catch(cause => { if (current) setError(`Replacement detail: ${apiError(cause)}`); })
      .finally(() => { if (current) setDetailLoading(false); });
    return () => { current = false; };
  }, [requestId]);
  const rawRequest = requestDetail && String(requestDetail.request_id) === requestId
    ? requestDetail : raw.find(item => String(item.request_id) === requestId);
  const request = rawRequest ? viewRequest(rawRequest) : requests.find(item => item.id === requestId);
  const status = request ? effectiveStatus(request) : undefined;
  const supply = rawRequest?.supplied_item_id ? { selectedBatteryId: rawRequest.supplied_item_id, selectedPartId: undefined as string | undefined, suppliedAt: rawRequest.supplied_at ?? undefined } : undefined;
  const partId = rawRequest?.part_category_id ?? null;
  const partCategory = categoryRows.find(p => p.id === partId);
  const partStock = stockRows.find(s => s.part_category_id === partId && s.hub_id === rawRequest?.hub_id);
  const matchedParts = request?.type === 'PART' && partCategory && rawRequest ? [{
    id: `PART-${partCategory.id}`, name: partCategory.name, quantity: partStock?.quantity ?? 0,
    active: partCategory.is_active !== false,
  }] : [];
  const damagedBattery = request?.type === 'BATTERY' ? batteries.find(b => b.id === request.batteryId) : undefined;
  const matchedBatteries = request?.type === 'BATTERY' && rawRequest?.quantity === 1 ? batteries
    .filter(b => b.status.toUpperCase() === 'ACTIVE' && b.drone_id == null && b.current_hub_id == null
      && (!damagedBattery || b.battery_model === damagedBattery.battery_model)
      && b.id !== damagedBattery?.id)
    .map(b => ({ id: b.id, model: b.battery_model ?? '—' })) : [];
  const droneModel = undefined; // ReplacementRequestOut does not expose Drone model.
  const suggestedId = request?.type === 'PART' ? matchedParts[0]?.id ?? ''
    : matchedBatteries.length === 1 ? matchedBatteries[0].id : '';
  const chosenId = selectedItemId || suggestedId;
  const chosenPart = matchedParts.find(part => part.id === chosenId);
  // Only AWAITING_SUPPLY may be changed. Backend validates inventory and atomic deductions.
  const actionable = !detailLoading && rawRequest?.status.toUpperCase() === 'AWAITING_SUPPLY';
  const canSupply = Boolean(actionable) && (request?.type === 'BATTERY'
    ? matchedBatteries.some(battery => battery.id === chosenId)
    : Boolean(chosenPart?.active && chosenPart.quantity >= (request?.quantity ?? 0)));
  const item = (entry: ReplacementRequest) => entry.type === 'PART'
    ? categoryRows.find(p => `PART-${p.id}` === entry.partId)?.name ?? raw.find(r => String(r.request_id) === entry.id)?.part_name ?? entry.partId ?? 'Spare part'
    : `Battery ${entry.batteryId ?? '—'}`;
  const hubName = (id: string) => hubs.find(h => String(h.id) === id)?.name ?? `Hub ${id}`;
  const visible = requests.filter(entry => (type === 'ALL' || type === entry.type)
    && (filter === 'ALL' || filter === effectiveStatus(entry))
    && `${entry.id} ${entry.technician} ${entry.droneId} ${entry.batteryId} ${entry.reason} ${item(entry)}`.toLowerCase().includes(query.trim().toLowerCase()));
  const count = (state: AdminEffectiveStatus) => requests.filter(entry => effectiveStatus(entry) === state).length;
  function openRequest(entry: ReplacementRequest) {
    const next = new URLSearchParams(params); next.set('request', entry.id); setParams(next);
    setRequestDetail(null); setSelectedItemId(''); setRejectMode(false); setRejectionReason(''); setError(''); setNotice('');
  }
  function closeRequest() {
    const next = new URLSearchParams(params); next.delete('request'); setParams(next);
    setRequestDetail(null); setSelectedItemId(''); setRejectMode(false); setRejectionReason(''); setError('');
  }
  async function confirmSupply() {
    if (!request || !rawRequest || !actionable || !canSupply || saving) return;
    if (request.type === 'BATTERY' && request.quantity !== 1) { setError('Only one replacement battery can be supplied per request.'); return; }
    if (!(await confirmAction({ title: 'Supply replacement', message: `Confirm supply for replacement ${request.id}? Stock will be updated and the technician notified.`, confirmLabel: 'Confirm Supply' }))) return;
    setSaving(true); setError('');
    try {
      await adminOperationsApi.supplyReplacement(rawRequest.request_id, request.type === 'BATTERY' ? chosenId : undefined);
      closeRequest(); setNotice(`Replacement ${request.id} supplied successfully.`); await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  async function confirmReject() {
    if (!request || !rawRequest || !actionable || !rejectMode || saving) return;
    const reason = rejectionReason.trim(); if (!reason) { setError('Enter a reason for rejection.'); return; }
    if (!(await confirmAction({ title: 'Reject replacement', message: `Reject replacement ${request.id}?`, confirmLabel: 'Confirm Rejection' }))) return;
    setSaving(true); setError('');
    try {
      await adminOperationsApi.rejectReplacement(rawRequest.request_id, reason);
      closeRequest(); setNotice(`Replacement ${request.id} rejected successfully.`); await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }

  const suppliedId = supply?.selectedPartId ?? supply?.selectedBatteryId ?? request?.approvedPartId ?? request?.partId ?? '—';

  const workOrderId = undefined; // Backend does not expose work_order_id on ReplacementRequestOut.

  return <AdminPageShell title="Replacement Records" description="Review reported replacement needs and confirm supply in one step.">

    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

      <ReplacementMetric label="Awaiting supply" value={count('AWAITING_SUPPLY')} note="Admin confirmation needed" icon={PackageCheck} />

      <ReplacementMetric label="Supplied" value={count('SUPPLIED')} note="Awaiting Technician receipt" icon={Truck} />

      <ReplacementMetric label="Received" value={count('RECEIVED')} note="Technician confirmed receipt" icon={CircleCheckBig} />
      <ReplacementMetric label="Rejected" value={count('REJECTED')} note="Closed without supply" icon={Ban} />

    </div>

    {loading && <OperatorLoadingState label="Loading replacement records…" />}
    {detailLoading && <OperatorLoadingState label="Loading replacement detail…" compact />}
    {error && !request && <div role="alert" className="mb-3 text-sm text-red-500">{error}</div>}
    {notice && <div role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-700">{notice}</div>}

    <OperatorPanel className="flush-panel">

      <AdminToolbar searchValue={query} onSearchChange={setQuery}

        placeholder="Search request, damaged item or technician…"

        meta={`${visible.length} of ${requests.length} records`}

        filters={<>

          <AdminSelect value={type} onChange={(event) => setType(event.target.value)}>

            <option value="ALL">All types</option><option value="PART">Spare parts</option><option value="BATTERY">Batteries</option>

          </AdminSelect>

          <AdminSelect value={filter} onChange={(event) => setFilter(event.target.value)}>

            <option value="ALL">All status</option>

            {(Object.keys(labels) as AdminEffectiveStatus[]).map((state) => <option key={state} value={state}>{labels[state]}</option>)}

          </AdminSelect>

        </>}

      />

      <div className="table-wrap"><OperatorTable className="admin-pinned-actions">

        <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Damaged item</TableHead><TableHead>Receiving Hub</TableHead><TableHead>Technician</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>

        <TableBody>

          {visible.map((entry) => {

            const entryStatus = effectiveStatus(entry);

            return <TableRow key={entry.id}>

              <TableCell><strong>{entry.id}</strong><small>{time(entry.createdAt)}</small></TableCell>

              <TableCell><strong>{item(entry)}</strong><small>{entry.droneId ?? entry.batteryId ?? '—'}</small></TableCell>

              <TableCell>{hubName(entry.hubId)}</TableCell><TableCell>{entry.technician}</TableCell><TableCell>{entry.quantity}</TableCell>

              <TableCell><ReplacementStatusText status={entryStatus} /></TableCell>

              <TableCell><ActionButton variant="secondary" onClick={() => openRequest(entry)}>View details</ActionButton></TableCell>

            </TableRow>;

          })}

          {!loading && !error && visible.length === 0 && <TableRow><TableCell colSpan={7} className="text-center">No matching replacement records.</TableCell></TableRow>}

        </TableBody>

      </OperatorTable></div>

    </OperatorPanel>

    <Dialog open={Boolean(requestId)} onOpenChange={(open) => { if (!open) closeRequest(); }}>

      <DialogContent aria-describedby={undefined}

        className="admin-replacement-dialog top-1/2 flex max-h-[calc(100dvh-32px)] w-[min(640px,calc(100%-30px))] -translate-y-1/2 flex-col overflow-hidden"

        style={{ fontFamily: adminDialogFont }}>

        {/* Header stays visible while the details scroll. */}

        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">

          <div className="min-w-0">

            <DialogTitle asChild><div className="text-lg font-semibold leading-snug" style={{ fontFamily: adminDialogFont, fontSize: 16, fontWeight: 600 }}>

              {request ? `Replacement ${request.id}` : 'Replacement not found'}

            </div></DialogTitle>

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

                Rejecting closes this request without supplying an item.

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

                <ReadOnlyFact label="Replacement item" value={request.type === 'PART' ? `${item(request)} · ${request.partId ?? '—'}` : damagedBattery?.battery_model ?? 'Unknown battery model'} />

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

                <AdminSelect id="replacement-item-select" className={`${selectClass} mt-2`} value={chosenId}

                  onChange={(event) => { setSelectedItemId(event.target.value); setError(''); }}>

                  <option value="">Select a replacement item</option>

                  {request.type === 'PART' ? matchedParts.map((part) => <option key={part.id} value={part.id}>

                    {part.id} · {part.name} · Available {part.quantity}

                  </option>) : matchedBatteries.map((battery) => <option key={battery.id} value={battery.id}>

                    {battery.id} · {battery.model}

                  </option>)}

                </AdminSelect>

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

                      : `/admin/replacement/new-batteries?model=${encodeURIComponent(damagedBattery?.battery_model ?? '')}&returnTo=${encodeURIComponent(`/admin/replacement/requests?request=${request.id}`)}`}>

                    {request.type === 'PART' ? 'Manage spare parts' : 'Manage new batteries'}

                  </Link>

                </div>}

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

              <ActionButton variant="danger" disabled={!rejectionReason.trim() || saving || !actionable} onClick={() => void confirmReject()}>Confirm Reject</ActionButton>

            </> : <>

              <ActionButton variant="secondary" onClick={closeRequest}>Close</ActionButton>

              {request && status === 'AWAITING_SUPPLY' && <ActionButton disabled={!canSupply || saving} onClick={() => void confirmSupply()}>Confirm Supply</ActionButton>}

            </>}

          </div>

        </div>

      </DialogContent>

    </Dialog>

  </AdminPageShell>;

}
