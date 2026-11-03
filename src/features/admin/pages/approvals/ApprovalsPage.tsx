import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, CheckCircle2, PackageCheck, Plus, History } from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogContent, DialogTitle } from '../../../../components/ui/Dialog';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { MetricCard } from '../../../operator/components/MetricCard';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { getAdminHubs, getAdminBatteries } from '../../services/adminStore';
import {
  addSparePartQuantity, getReplacementRequests, getSpareParts, saveSparePart,
  type ReplacementRequest, type SparePart,
} from '../../services/prototypeWorkflow';
import {
  approveReplacementRequest, getAdminEffectiveStatus, getAdminSupplyRecord,
  getAdminSupplyTimeline, getMatchingBatteryOptions, getMatchingPartOptions,
  getRequestDroneModel, nextAdminBatteryId, registerNewReplacementBattery, rejectReplacementRequest, supplyApprovedReplacement,
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
const formatMoney = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' VND';

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
  const [partModal, setPartModal] = useState<'CREATE' | 'ADD' | null>(null);
  const [newPartId, setNewPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [referenceCost, setReferenceCost] = useState(0);
  const [paid, setPaid] = useState(false);
  const [unitPrice, setUnitPrice] = useState(0);
  const [batterySerial, setBatterySerial] = useState('');
  const [batteryPaid, setBatteryPaid] = useState(false);
  const [batteryPrice, setBatteryPrice] = useState(0);

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
  const selectedPart = parts.find((part) => part.id === selectedItemId);
  const damagedPart = request?.type === 'PART' ? parts.find((part) => part.id === request.partId) : undefined;
  const damagedBattery = request?.type === 'BATTERY' ? batteries.find((battery) => battery.id === request.batteryId) : undefined;
  const droneModel = request ? getRequestDroneModel(request) : undefined;
  const availablePart = matchingParts.find((part) => part.id === selectedItemId);

  function openRequest(next: ReplacementRequest) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('request', next.id);
    setParams(nextParams);
    setAdminNote(''); setError(''); setNotice(''); setSelectedItemId(''); setPartModal(null);
  }
  function back() {
    const nextParams = new URLSearchParams(params);
    nextParams.delete('request'); setParams(nextParams);
    setError(''); setNotice(''); setSelectedItemId(''); setPartModal(null);
  }
  function run(action: () => void, message: string) {
    try { action(); setError(''); setNotice(message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to process this request.'); }
  }
  function approve() {
    if (!request) return;
    run(() => { approveReplacementRequest(request.id, adminNote); setSelectedItemId(''); },
      'Approved. Now select or create a replacement item below, then confirm supply.');
  }
  function reject() {
    if (!request) return;
    run(() => rejectReplacementRequest(request.id, adminNote), 'Request rejected with the recorded reason.');
  }
  function confirmSupply() {
    if (!request) return;
    const id = request.type === 'BATTERY' ? getAdminSupplyRecord(request.id)?.registeredBatteryId ?? '' : selectedItemId;
    run(() => supplyApprovedReplacement(request.id, id),
      `Replacement ${id} supplied. The request is now ready for Technician receipt.`);
  }
  function registerReplacementBattery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || request.type !== 'BATTERY') return;
    try {
      const created = registerNewReplacementBattery(request.id, batterySerial, batteryPaid ? batteryPrice : undefined);
      setSelectedItemId(created.id);
      setBatterySerial(''); setBatteryPaid(false); setBatteryPrice(0); setError('');
      setNotice(`New battery ${created.id} registered for ${hubName(request.hubId)}. Confirm supply next; it cannot be READY until Technician inspection.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to register new battery.'); }
  }
  function openNewPart() {
    setPartModal('CREATE'); setNewPartId(''); setQuantity(1); setReferenceCost(0);
    setPaid(false); setUnitPrice(0); setError('');
  }
  function openAddPart() {
    setPartModal('ADD'); setQuantity(1); setPaid(false); setUnitPrice(0); setError('');
  }
  function savePart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || request.type !== 'PART') return;
    try {
      if (partModal === 'CREATE') {
        if (!damagedPart || !droneModel) throw new Error('Request needs a known component and drone model.');
        if (parts.some((part) => part.id === newPartId.trim().toUpperCase()))
          throw new Error('Part ID already exists; select it or use Add quantity.');
        const newPart: SparePart = {
          id: newPartId.trim().toUpperCase(), name: damagedPart.name, compatibleModels: droneModel,
          active: true, quantity, unitCostVnd: referenceCost,
        };
        saveSparePart(newPart, paid ? { paid: true, actualUnitCostVnd: unitPrice } : undefined);
        setSelectedItemId(newPart.id);
        setNotice(`Created ${newPart.id} in Spare Parts. Confirm supply to deduct ${request.quantity} unit(s).`);
      } else if (partModal === 'ADD') {
        if (!selectedPart) throw new Error('Select a spare part first.');
        addSparePartQuantity(selectedPart.id, quantity,
          paid ? { paid: true, actualUnitCostVnd: unitPrice } : undefined);
        setNotice(`Added ${quantity} unit(s) to ${selectedPart.id}. Confirm supply when ready.`);
      }
      setPartModal(null); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save spare part.'); }
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
    const timeline = getAdminSupplyTimeline(request);
    const previouslySelected = supply?.selectedPartId ?? supply?.selectedBatteryId ?? request.approvedPartId;
    const batterySupplyId = supply?.registeredBatteryId ?? '';
    const canSupply = request.type === 'BATTERY'
      ? matchingBatteries.some((battery) => battery.id === batterySupplyId)
      : Boolean(selectedItemId && availablePart && availablePart.quantity >= request.quantity);
    return <AdminPageShell title={`Request ${request.id}`} description="Review, select a compatible replacement and track the supply decision. A Technician work order remains Technician-owned.">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" className="text-button inline-flex items-center gap-2" onClick={back}><ArrowLeft size={16} /> Back to approvals</button>
        <StatusBadge tone={tones[effective]}>{labels[effective]}</StatusBadge>
      </div>
      {notice && <p role="status" className="mb-3 rounded-md border border-emerald-200 p-3 text-sm text-emerald-700">{notice}</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          <OperatorPanel>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold"><ClipboardList size={18} color="#FF6B00" /> Technician's reported issue</h2>
            <dl className="key-values">
              <div><dt>Request</dt><dd>{request.id}</dd></div>
              <div><dt>Type</dt><dd>{request.type === 'PART' ? 'Drone spare part' : 'Battery replacement'}</dd></div>
              <div><dt>Damaged item</dt><dd>{item(request)} {request.type === 'PART' ? `· ${request.partId}` : ''}</dd></div>
              <div><dt>Drone / Battery</dt><dd>{request.type === 'PART' ? request.droneId ?? '—' : request.batteryId ?? '—'}</dd></div>
              <div><dt>Model</dt><dd>{request.type === 'PART' ? droneModel ?? 'Unknown drone model' : damagedBattery?.model ?? 'Unknown battery model'}</dd></div>
              <div><dt>Receiving Hub</dt><dd>{hubName(request.hubId)}</dd></div>
              <div><dt>Technician</dt><dd>{request.technician}</dd></div>
              <div><dt>Quantity</dt><dd>{request.quantity}</dd></div>
              <div><dt>Requested at</dt><dd>{time(request.createdAt)}</dd></div>
              {(request as ReplacementRequest & { workOrderId?: string }).workOrderId && <div><dt>Work order reference</dt><dd>{(request as ReplacementRequest & { workOrderId?: string }).workOrderId}</dd></div>}
            </dl>
            <div className="mt-4 rounded-lg border border-border p-4">
              <p className="mb-1 text-xs text-muted-foreground">Damage / reported problem</p>
              <p className="text-sm font-medium">{request.reason}</p>
            </div>
          </OperatorPanel>

          {effective === 'PENDING' && <OperatorPanel>
            <h2 className="mb-3 text-base font-semibold">Admin decision</h2>
            <p className="mb-3 text-sm text-muted-foreground">Approving accepts the replacement need; no part is deducted yet. Next, choose or register the supplied item.</p>
            <label className="block text-sm"><span>Admin note / reason for rejection</span>
              <textarea rows={3} className="mt-2 w-full rounded-md border border-border bg-transparent p-3" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Review findings and notes…" />
            </label>
            <div className="form-actions mt-4">
              <ActionButton variant="danger" onClick={reject}>Reject</ActionButton>
              <ActionButton onClick={approve}>Approve request</ActionButton>
            </div>
          </OperatorPanel>}

          {effective === 'AWAITING_SUPPLY' && <OperatorPanel>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><PackageCheck size={18} color="#FF6B00" /> Select & supply replacement</h2>
            {/* <p className="mb-4 text-sm text-muted-foreground">Request approved. {request.type === 'PART' ? 'Choose or register a matching spare part.' : 'Register one brand-new replacement battery for the requested Hub.'} Confirm supply when the replacement item is ready.</p> */}
            {request.type === 'PART' ? <>
              <label className="block text-sm"><span>Compatible spare part</span>
                <select className="mt-2 w-full rounded-md border border-border bg-transparent p-3" value={selectedItemId} onChange={(e) => { setSelectedItemId(e.target.value); setError(''); }}>
                  <option value="">Select an available component…</option>
                  {matchingParts.map((part) => <option value={part.id} key={part.id}>{part.id} · {part.name} · {part.compatibleModels} ({part.quantity})</option>)}
                </select>
              </label>
              {selectedPart && <div className="mt-4 rounded-lg border border-border p-3">
                <div className="flex flex-wrap justify-between gap-3"><div><small>Selected Part ID</small><strong className="block">{selectedPart.id}</strong></div><div><small>Quantity available</small><strong className="block">{selectedPart.quantity}</strong></div><div><small>Required</small><strong className="block">{request.quantity}</strong></div></div>
                <p className="mt-3 text-sm">After supply: <strong>{selectedPart.quantity >= request.quantity ? selectedPart.quantity - request.quantity : 'Insufficient quantity'}</strong></p>
              </div>}
              {!matchingParts.length && <p className="mt-3 text-sm text-orange-600">No compatible Part SKU yet. Create one with this drone model before supplying.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton variant="secondary" icon="plus" onClick={openNewPart}>Create spare part</ActionButton>
                <ActionButton variant="secondary" disabled={!selectedPart} onClick={openAddPart}>Add quantity</ActionButton>
                <Link to="/admin/network/drones/spare-parts" className="text-button self-center">View Spare Parts</Link>
              </div>
            </> : <>
              {/* <p className="mb-4 text-sm text-muted-foreground">This request always receives a <strong>brand-new battery</strong>. Battery ID, model and Hub are assigned from the reported damaged battery. Existing Battery IDs cannot be selected.</p> */}
              {damagedBattery ? <>
                <dl className="key-values mb-4">
                  <div><dt>Damaged Battery</dt><dd>{damagedBattery.id}</dd></div>
                  <div><dt>Replacement Model</dt><dd>{damagedBattery.model}</dd></div>
                  <div><dt>Receiving Hub</dt><dd>{hubName(request.hubId)}</dd></div>
                </dl>
                {matchingBatteries.length ? <div className="rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">New battery registered: {matchingBatteries[0].id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{matchingBatteries[0].serialNumber} · Pending Technician inspection</p>
                  <Link className="text-button mt-2 inline-block" to={`/admin/network/batteries/${matchingBatteries[0].id}`}>View registered battery</Link>
                </div> : <form onSubmit={registerReplacementBattery} className="rounded-lg border border-border p-4">
                  <h3 className="mb-3 font-semibold">Register new battery</h3>
                  <div className="fields two">
                    <label><span>New Battery ID</span><input readOnly value={nextAdminBatteryId(batteries)} /></label>
                    <label><span>Hub (from request)</span><input readOnly value={hubName(request.hubId)} /></label>
                    <label><span>Battery Model</span><input readOnly value={damagedBattery.model} /></label>
                    <label><span>New serial number</span><input required placeholder="Enter serial from the newly received battery" value={batterySerial} onChange={(e) => setBatterySerial(e.target.value)} /></label>
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={batteryPaid} onChange={(e) => setBatteryPaid(e.target.checked)} /> Purchase already paid — record an expense</label>
                  {batteryPaid && <label className="mt-3 block text-sm"><span>Actual paid price (VND)</span><input required type="number" min={1} step={1} value={batteryPrice || ''} onChange={(e) => setBatteryPrice(Number(e.target.value))} /></label>}
                  {/* <p className="my-3 text-xs text-muted-foreground">Register only after the physical new battery has been received. The initial status is Maintenance / Pending inspection; Charge 100%, SOH 100% and Cycles 0 are provisional demo values.</p> */}
                  <ActionButton type="submit" icon="plus">Register new battery</ActionButton>
                </form>}
              </> : <p className="text-sm text-red-500">Damaged Battery ID was not found. Registration is blocked to prevent an incorrect replacement model.</p>}
            </>}
            <div className="mt-4 border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Spare parts are deducted once on Confirm supply. A new battery is registered under the receiving Hub and remains Pending inspection.</p>
              <ActionButton disabled={!canSupply} onClick={confirmSupply}><CheckCircle2 size={16} /> Confirm supply</ActionButton>
            </div>
          </OperatorPanel>}

          {(effective === 'SUPPLIED' || effective === 'RECEIVED') && <OperatorPanel>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><PackageCheck size={18} color="#FF6B00" /> Supply details</h2>
            <dl className="key-values">
              <div><dt>Provided item</dt><dd>{previouslySelected ?? 'Historical record · item not recorded'}</dd></div>
              <div><dt>Quantity</dt><dd>{request.quantity}</dd></div>
              <div><dt>Supplied at</dt><dd>{time(supply?.suppliedAt ?? request.reviewedAt)}</dd></div>
              <div><dt>Technician receipt</dt><dd>{effective === 'RECEIVED' ? `Confirmed · ${time(request.fulfilledAt)}` : 'Awaiting confirmation'}</dd></div>
              {request.type === 'BATTERY' && <div><dt>New battery readiness</dt><dd>{batteries.find((battery) => battery.id === previouslySelected)?.inspectionPending === false ? 'Inspected — Ready' : 'Pending Technician inspection — see Battery Detail'}</dd></div>}
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">{effective === 'RECEIVED' ? 'Technician confirmed receipt. The actual replacement and inspection are handled through Technician Maintenance / Work Orders.' : 'Supplied and ready for Technician Confirm Receipt. The same part cannot be deducted twice.'}</p>
          </OperatorPanel>}

          {effective === 'REJECTED' && <OperatorPanel>
            <h2 className="mb-2 text-base font-semibold">Rejected</h2>
            <p className="text-sm"><strong>Reason:</strong> {request.adminNote || 'No reason recorded in older sample data.'}</p>
          </OperatorPanel>}
          {error && <p role="alert" className="rounded-md border border-red-200 p-3 text-sm text-red-600">{error}</p>}
        </div>
        <div className="space-y-4">
          <OperatorPanel>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold"><History size={18} color="#FF6B00" /> Request history</h2>
            <ol className="space-y-4">{timeline.map((entry, i) => <li key={`${entry.at}-${i}`} className="border-l-2 border-orange-200 pl-3">
              <p className="text-xs text-muted-foreground">{time(entry.at)}</p>
              <p className="mt-1 text-sm font-semibold">{entry.action.replaceAll('_', ' ')}</p>
              <p className="text-sm">{entry.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.by}</p>
            </li>)}</ol>
          </OperatorPanel>
          <OperatorPanel>
            <h2 className="mb-2 text-base font-semibold">Related management</h2>
            <div className="flex flex-col gap-3 text-sm">
              <Link className="text-button" to="/admin/network/drones/spare-parts">Spare Parts</Link>
              <Link className="text-button" to="/admin/network/batteries">Batteries</Link>
              {request.type === 'PART' && request.droneId && <Link className="text-button" to={`/admin/network/drones/${request.droneId}`}>View affected drone</Link>}
            </div>
          </OperatorPanel>
        </div>
      </div>

      <Dialog open={Boolean(partModal)} onOpenChange={(open) => !open && setPartModal(null)}>
        {partModal && <DialogContent className="max-h-[85vh] overflow-y-auto"><form onSubmit={savePart}>
          <div className="border-b border-border p-5"><DialogTitle className="text-lg font-semibold">{partModal === 'CREATE' ? 'Register compatible spare part' : 'Add spare part quantity'}</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">For {request.droneId} · {droneModel} · {damagedPart?.name}. No Hub inventory is created.</p>
          </div>
          <div className="fields two p-5">
            {partModal === 'CREATE' && <>
              <label><span>New Part ID</span><input value={newPartId} required placeholder="PART-M350-MOTOR-02" onChange={(e) => setNewPartId(e.target.value.toUpperCase())} /></label>
              <label><span>Compatible drone model</span><input readOnly value={droneModel ?? ''} /></label>
              <label><span>Reference unit cost (VND)</span><input type="number" min={0} step={1} value={referenceCost} onChange={(e) => setReferenceCost(Number(e.target.value))} /></label>
            </>}
            {partModal === 'ADD' && <label><span>Existing part</span><input readOnly value={selectedPart?.id ?? ''} /></label>}
            <label><span>{partModal === 'CREATE' ? 'Initial quantity' : 'Additional quantity'}</span><input required type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
          </div>
          <div className="mx-5 border-t border-border pt-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Purchase already paid — record cash expense</label>
            {paid && <div className="mt-3 fields two"><label><span>Actual price per unit (VND)</span><input required type="number" min={1} step={1} value={unitPrice || ''} onChange={(e) => setUnitPrice(Number(e.target.value))} /></label><label><span>Expense</span><input readOnly value={formatMoney(quantity * unitPrice)} /></label></div>}
          </div>
          {error && <p role="alert" className="mx-5 mt-3 text-sm text-red-500">{error}</p>}
          <div className="form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={() => setPartModal(null)}>Cancel</ActionButton><ActionButton type="submit">{partModal === 'CREATE' ? 'Register spare part' : 'Add quantity'}</ActionButton></div>
        </form></DialogContent>}
      </Dialog>
    </AdminPageShell>;
  }

  const count = (state: AdminEffectiveStatus) => requests.filter((r) => getAdminEffectiveStatus(r) === state).length;
  return <AdminPageShell title="Approvals" description="Technician replacement requests → Admin review → select or register replacement → supply → Technician receipt.">
    <div className="metric-grid">
      <MetricCard label="Pending" value={String(count('PENDING'))} delta="Review" tone="warning" note="Waiting for Admin decision" />
      <MetricCard label="Approved" value={String(count('AWAITING_SUPPLY'))} delta="Supply needed" tone="info" note="Choose a replacement item" />
      <MetricCard label="Supplied" value={String(count('SUPPLIED'))} delta="Technician" tone="info" note="Awaiting receipt" />
      <MetricCard label="Received" value={String(count('RECEIVED'))} delta="Confirmed" tone="success" note="Technician confirmed receipt" />
    </div>
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search request, damaged item or technician…" meta={`${visible.length} of ${requests.length} requests`} filters={<>
        <select value={type} onChange={(e) => setType(e.target.value)}><option value="ALL">All requests</option><option value="PART">Spare parts</option><option value="BATTERY">Batteries</option></select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="ALL">All status</option>{(Object.keys(labels) as AdminEffectiveStatus[]).map((state) => <option key={state} value={state}>{labels[state]}</option>)}</select>
      </>} />
      <div className="table-wrap"><table><thead><tr><th>Request</th><th>Damaged item</th><th>Receiving Hub</th><th>Technician</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{visible.map((r) => {
          const state = getAdminEffectiveStatus(r); return <tr key={r.id}>
            <td><strong>{r.id}</strong><small>{time(r.createdAt)}</small></td>
            <td><strong>{item(r)}</strong><small>{r.droneId ?? r.batteryId ?? '—'}</small></td>
            <td>{hubName(r.hubId)}</td><td>{r.technician}</td><td>{r.quantity}</td>
            <td><StatusBadge tone={tones[state]}>{labels[state]}</StatusBadge></td>
            <td><ActionButton variant="secondary" onClick={() => openRequest(r)}>View details</ActionButton></td>
          </tr>
        })}
          {!visible.length && <tr><td colSpan={7} className="text-center">No matching requests.</td></tr>}
        </tbody>
      </table></div>
    </OperatorPanel>
    <p className="mt-3 text-xs text-muted-foreground">Rejected requests: {count('REJECTED')}. Data is saved locally for the prototype. Physical repairs are tracked separately by Technician Work Orders.</p>
  </AdminPageShell>;
}
