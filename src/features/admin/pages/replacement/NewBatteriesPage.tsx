import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BatteryCharging, Box, CalendarDays, Pencil, ReceiptText, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { getAdminBatteries } from '../../services/adminStore';
import {
  editAvailableNewBattery,
  getAvailableNewBatteries,
  getNewBatteryReferenceUnitCostVnd,
  registerAdminNewBatteries,
  removeAvailableNewBattery,
} from '../../services/adminNewBatterySupply';
import type { AdminBattery } from '../../types';
import './NewBatteriesQuantityDialog.css';

const field = 'h-10 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-sm text-[var(--admin-text)] outline-none focus:border-[#FF6B00]';
const formatVnd = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

function thisWeekStart(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}
function CompactMetric({ label, value, note, icon: Icon }: {
  label: string; value: number; note: string; icon: typeof BatteryCharging;
}) {
  return <div className="min-w-0 px-4 py-3" style={{
    backgroundColor: '#FFFFFF', border: '1px solid #DDE2E8', borderRadius: 12,
    boxShadow: '0 8px 22px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.05)', minHeight: 112,
  }}>
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 text-xs font-medium text-[var(--admin-muted)]">{label}</span>
      <Icon size={18} strokeWidth={1.8} className="shrink-0 text-[#FF6B00]" aria-hidden="true" />
    </div>
    <strong className="mt-1 block text-2xl font-bold leading-tight text-[var(--admin-text)]">{value}</strong>
    <span className="mt-0.5 block text-[11px] text-[var(--admin-subtle)]">{note}</span>
  </div>;
}

/** Model-level inventory matches Spare Parts. Individual Battery IDs remain
 * available via View units and for the existing replacement supply workflow. */
export function NewBatteriesPage() {
  const [params] = useSearchParams();
  const modelHint = params.get('model') ?? '';
  const backlink = params.get('returnTo') ?? '';
  const validReturn = /^\/admin\/(replacement\/requests|approvals)\?request=[\w-]+$/.test(backlink) ? backlink : '';
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('ALL');
  const [creating, setCreating] = useState(false);
  const [model, setModel] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [serials, setSerials] = useState('');
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminBattery | null>(null);
  const [editSerial, setEditSerial] = useState('');
  const [removing, setRemoving] = useState<AdminBattery | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    // Do not auto-seed fictional stock. Keep data already registered in this browser.
    const handler = () => setVersion((value) => value + 1);
    window.addEventListener('admin-data-updated', handler);
    return () => window.removeEventListener('admin-data-updated', handler);
  }, []);

  const available = useMemo(() => getAvailableNewBatteries(), [version]);
  const models = useMemo(() => [...new Set(getAdminBatteries().map((battery) => battery.model).filter(Boolean))].sort(), [version]);
  const modelSummary = useMemo(() => models.map((name) => ({
    name, quantity: available.filter((battery) => battery.model === name).length,
    referencePrice: getNewBatteryReferenceUnitCostVnd(name),
  })), [models, available]);
  const shown = modelSummary.filter((item) => {
    if (modelFilter !== 'ALL' && item.name !== modelFilter) return false;
    if (!search.trim()) return true;
    const match = search.toLowerCase().trim();
    return item.name.toLowerCase().includes(match) || available.some((battery) => battery.model === item.name
      && `${battery.id} ${battery.serialNumber}`.toLowerCase().includes(match));
  });
  const startOfWeek = thisWeekStart().getTime();
  const addedThisWeek = available.filter((battery) => {
    if (!battery.adminReceivedAt) return false;
    const when = Date.parse(battery.adminReceivedAt);
    return when >= startOfWeek && when <= Date.now();
  }).length;
  const existingQuantity = modelSummary.find((item) => item.name === model)?.quantity ?? 0;
  const referencePrice = getNewBatteryReferenceUnitCostVnd(model);
  const enteredSerialLines = serials.replace(/\r/g, '').split('\n');
  const serialCount = enteredSerialLines.filter((serial) => !!serial.trim()).length;
  const hasTooManySerialLines = enteredSerialLines.some((line, index) => index >= quantity && !!line.trim());
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 30;
  const validCost = validQuantity && Number.isSafeInteger(referencePrice) && referencePrice > 0
    && Number.isSafeInteger(referencePrice * quantity);

  function openCreate(selectedModel?: string) {
    setModel(selectedModel && models.includes(selectedModel) ? selectedModel : models.includes(modelHint) ? modelHint : models[0] ?? '');
    setQuantity(1);
    setSerials('');
    setError(''); setNotice(''); setCreating(true);
  }
  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validCost || hasTooManySerialLines) return;
    try {
      const entries = registerAdminNewBatteries(model, quantity, enteredSerialLines);
      setCreating(false); setError(''); setExpandedModel(model);
      setNotice(`Recorded ${entries.length} new ${model} batteries. Battery IDs: ${entries.map((battery) => battery.id).join(', ')}. One reference acquisition entry created (demo, no bank payment).`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add batteries.'); }
  }
  function openEdit(battery: AdminBattery) {
    setEditSerial(battery.serialNumber);
    setError(''); setNotice(''); setEditing(battery);
  }
  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return;
    try {
      editAvailableNewBattery(editing.id, editing.model, editSerial);
      setEditing(null); setError(''); setNotice(`Battery ${editing.id} updated.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update serial number.'); }
  }
  function remove() {
    if (!removing) return;
    try {
      removeAvailableNewBattery(removing.id, removalReason);
      setRemoving(null); setRemovalReason(''); setError(''); setNotice(`${removing.id} removed from available new batteries.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove battery.'); }
  }
  const expandedUnits = available.filter((battery) => battery.model === expandedModel).sort((a, b) => a.id.localeCompare(b.id));

  return <AdminPageShell title="New Batteries" actions={<ActionButton icon="plus" onClick={() => openCreate()}>Add batteries</ActionButton>}>
    {validReturn && <div className="mb-3"><Link className="text-button" to={validReturn}>Back to replacement request</Link></div>}
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <CompactMetric label="Total new batteries" value={available.length} note="Unassigned · available for supply" icon={BatteryCharging} />
      <CompactMetric label="Battery models" value={modelSummary.filter((item) => item.quantity > 0).length} note="Models currently in stock" icon={Box} />
      <CompactMetric label="Added this week" value={addedThisWeek} note="Registered by Admin" icon={CalendarDays} />
    </div>
    {notice && <p className="mb-3 text-sm text-green-600" role="status">{notice}</p>}
    <p className="mb-3 text-xs text-[var(--admin-muted)]">Demo inventory is stored in this browser. The current Backend API does not yet support bulk battery registration without serial numbers or cross-account supply notifications.</p>
    <OperatorPanel className="flush-panel">
      <AdminToolbar
        searchValue={search} onSearchChange={setSearch}
        placeholder="Search Battery Model, Battery ID or serial…"
        filters={<select aria-label="Filter by battery model" value={modelFilter} onChange={(event) => setModelFilter(event.target.value)}>
          <option value="ALL">All battery models</option>{models.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>}
        meta={`${shown.length} of ${modelSummary.length} battery models`}
      />
      <div className="table-wrap"><table><thead><tr><th>Battery Model</th><th>Current Quantity</th><th>Reference Unit Price</th><th>Actions</th></tr></thead>
        <tbody>{shown.map((item) => <tr key={item.name}>
          <td><strong>{item.name}</strong></td>
          <td><strong className={item.quantity === 0 ? 'text-orange-500' : undefined}>{item.quantity}</strong><small>Unassigned units</small></td>
          <td>{item.referencePrice > 0 ? formatVnd(item.referencePrice) : 'Not configured'}</td>
          <td><div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="ghost" onClick={() => setExpandedModel(expandedModel === item.name ? null : item.name)}>
              {expandedModel === item.name ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              View units
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => openCreate(item.name)}>Add Quantity</ActionButton>
          </div></td>
        </tr>)}
        {!shown.length && <tr><td colSpan={4} className="py-8 text-center text-[var(--admin-muted)]">No matching battery models.</td></tr>}
        </tbody></table></div>
    </OperatorPanel>
    {expandedModel && <OperatorPanel className="flush-panel mt-4">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-border)] p-4">
        <div><strong>{expandedModel}</strong><p className="text-xs text-[var(--admin-muted)]">Individual Battery IDs · {expandedUnits.length} unit(s)</p></div>
        <ActionButton variant="secondary" onClick={() => setExpandedModel(null)}>Close</ActionButton>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Battery ID</th><th>Serial Number</th><th>Created on</th><th>Actions</th></tr></thead><tbody>
        {expandedUnits.map((battery) => <tr key={battery.id}>
          <td><strong>{battery.id}</strong></td>
          <td>{battery.serialNumber.trim() || <span className="text-[var(--admin-muted)]">Not provided</span>}</td>
          <td>{battery.adminReceivedAt ? new Date(battery.adminReceivedAt).toLocaleString('en-GB') : '—'}</td>
          <td><div className="flex items-center gap-2">
            <button type="button" aria-label={`Edit ${battery.id}`} title="Edit serial" onClick={() => openEdit(battery)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:border-[#FF6B00] hover:text-[#FF6B00]"><Pencil size={15}/></button>
            <button type="button" aria-label={`Remove ${battery.id}`} title="Remove new battery" onClick={() => { setError(''); setNotice(''); setRemovalReason(''); setRemoving(battery); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] text-red-500 hover:border-red-400"><Trash2 size={15}/></button>
          </div></td>
        </tr>)}
        {expandedUnits.length === 0 && <tr><td colSpan={4} className="p-5 text-center text-[var(--admin-muted)]">No new units in this model yet.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>}

    <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
      {creating && <DialogContent className="new-batteries-quantity-dialog"><form onSubmit={register}>
        <div className="new-batteries-quantity-header">
          <DialogTitle className="text-lg font-semibold">Add New Batteries</DialogTitle>
          <p>Increase inventory by Battery Model — same process as Spare Parts.</p>
        </div>
        <div className="new-batteries-quantity-body">
          <label className="block text-sm"><span>Battery Model <span className="text-red-500">*</span></span>
            <select required className={`${field} mt-2`} value={model} onChange={(event) => setModel(event.target.value)}>
              <option value="">Select Battery Model</option>{models.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <div className="new-batteries-quantity-fields">
            <label><span>Current Quantity</span><input className="new-batteries-quantity-input is-readonly" type="text" readOnly tabIndex={-1} value={existingQuantity}/></label>
            <label><span>Quantity to Add <span className="text-red-500">*</span></span><input className="new-batteries-quantity-input" type="number" required min={1} max={30} step={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}/></label>
          </div>
          <div className="new-batteries-quantity-result"><span>Quantity after addition</span><strong>{validQuantity ? `${existingQuantity + quantity} units` : '—'}</strong></div>
          <label className="block text-sm"><span>Serial Numbers <span className="text-[var(--admin-muted)]">(Optional)</span></span>
            <textarea rows={3} className={`${field} mt-2 !h-auto resize-y py-2`} placeholder={'One serial per line if available\nLeave blank to register without serials'} value={serials} onChange={(event) => setSerials(event.target.value)} />
          </label>
          <p className="new-batteries-quantity-hint">{serialCount} serial(s) entered for {validQuantity ? quantity : '—'} new unit(s). Battery IDs are generated automatically. Missing serials remain empty; no fictional manufacturer serials.</p>
          {hasTooManySerialLines && <p role="alert" className="new-batteries-quantity-error">More serial lines than Quantity. Remove extra lines or increase Quantity.</p>}
          <div className="new-batteries-quantity-cost">
            <div className="new-batteries-quantity-cost-title"><span><ReceiptText size={17} aria-hidden="true"/>Acquisition Cost</span><small>Auto calculated · demo</small></div>
            <div className="new-batteries-quantity-cost-row"><span>Reference Unit Price</span><strong>{referencePrice > 0 ? formatVnd(referencePrice) : 'Not configured'}</strong></div>
            <div className="new-batteries-quantity-cost-row"><span>Quantity</span><strong>{validQuantity ? quantity : '—'}</strong></div>
            <div className="new-batteries-quantity-cost-row is-total"><span>Total Recorded Cost</span><strong>{validCost ? formatVnd(referencePrice * quantity) : '—'}</strong></div>
            <p className="new-batteries-quantity-hint">One recorded acquisition cost per batch. No supplier payment or bank transfer. Pin remains in Admin stock until separately supplied.</p>
          </div>
          {error && <p role="alert" className="new-batteries-quantity-error">{error}</p>}
        </div>
        <div className="new-batteries-quantity-footer"><ActionButton variant="secondary" onClick={() => setCreating(false)}>Cancel</ActionButton><ActionButton type="submit" disabled={!model || !validCost || hasTooManySerialLines}>Confirm Addition</ActionButton></div>
      </form></DialogContent>}
    </Dialog>

    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
      {editing && <DialogContent className="new-batteries-quantity-dialog"><form onSubmit={saveEdit}>
        <div className="new-batteries-quantity-header"><DialogTitle className="text-lg font-semibold">Edit {editing.id}</DialogTitle><p>Update an optional serial number for this unit.</p></div>
        <div className="new-batteries-quantity-body space-y-4"><label className="block text-sm"><span>Battery Model</span><input readOnly className={`${field} mt-2`} value={editing.model}/></label>
          <label className="block text-sm"><span>Serial Number (Optional)</span><input className={`${field} mt-2`} value={editSerial} onChange={(event) => setEditSerial(event.target.value)} placeholder="Not provided"/></label>
          {error && <p role="alert" className="new-batteries-quantity-error">{error}</p>}
        </div>
        <div className="new-batteries-quantity-footer"><ActionButton variant="secondary" onClick={() => setEditing(null)}>Cancel</ActionButton><ActionButton type="submit">Save Changes</ActionButton></div>
      </form></DialogContent>}
    </Dialog>

    <Dialog open={Boolean(removing)} onOpenChange={(open) => { if (!open) { setRemoving(null); setRemovalReason(''); setError(''); } }}>
      {removing && <DialogContent className="new-batteries-quantity-dialog"><div className="new-batteries-quantity-header"><DialogTitle className="text-lg font-semibold">Remove {removing.id}?</DialogTitle><p>Only units not yet supplied can be removed.</p></div>
        <div className="new-batteries-quantity-body"><label className="block text-sm" htmlFor="new-battery-removal-reason"><span>Reason for removal <span className="text-red-500">*</span></span>
          <textarea id="new-battery-removal-reason" className={`${field} mt-2 !h-auto resize-none py-2`} rows={3} maxLength={500} required placeholder="Enter reason…" value={removalReason} onChange={(event) => setRemovalReason(event.target.value)}/></label>
          {error && <p role="alert" className="new-batteries-quantity-error">{error}</p>}
        </div>
        <div className="new-batteries-quantity-footer"><ActionButton variant="secondary" onClick={() => { setRemoving(null); setRemovalReason(''); setError(''); }}>Cancel</ActionButton><ActionButton variant="danger" disabled={!removalReason.trim()} onClick={remove}>Remove Battery</ActionButton></div>
      </DialogContent>}
    </Dialog>
  </AdminPageShell>;
}
