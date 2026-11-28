import { AdminSummaryCard as CompactMetric } from "../../components/AdminSummaryCard";
import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../operator/components/OperatorTable";
import { useAdminConfirm } from '../../components/AdminConfirmDialog';
import { invalidateAdminReads } from '../../api/adminHttp';
import { AdminSelect } from '../../components/AdminSelect';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BatteryCharging, Box, CalendarDays, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminOperationsApi, apiError, type BatteryApi, type BatteryModelApi } from '../../api/adminOperationsApi';
import './NewBatteriesQuantityDialog.css';

const field = 'h-11 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-sm text-[var(--admin-text)] outline-none focus:border-[#FF6B00]';

function thisWeekStart(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

/** Model-level inventory matches Spare Parts. Individual Battery IDs remain
 * available via View units and for the existing replacement supply workflow. */
export function NewBatteriesPage() {
  const confirmAction = useAdminConfirm();
  const [params] = useSearchParams();
  const modelHint = params.get('model') ?? '';
  const backlink = params.get('returnTo') ?? '';
  const validReturn = /^\/admin\/(replacement\/requests|approvals)\?request=[\w-]+$/.test(backlink) ? backlink : '';
  const [allBatteries, setAllBatteries] = useState<BatteryApi[]>([]);
  const available = useMemo(() => allBatteries.filter(b => b.current_hub_id == null && b.drone_id == null), [allBatteries]);
  const [catalog, setCatalog] = useState<BatteryModelApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('ALL');
  const [creating, setCreating] = useState(false);
  const [model, setModel] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [removing, setRemoving] = useState<BatteryApi | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    setLoading(true);
    const [batteries, modelsResult] = await Promise.allSettled([
      adminOperationsApi.batteries(), adminOperationsApi.batteryModels(),
    ]);
    if (batteries.status === 'fulfilled') {
      // New Batteries shows physical batteries in Admin warehouse only, never browser data.
      setAllBatteries(batteries.value);
    } else setAllBatteries([]);
    setCatalog(modelsResult.status === 'fulfilled' ? modelsResult.value : []);
    setError([
      batteries.status === 'rejected' ? `Batteries: ${apiError(batteries.reason)}` : '',
      modelsResult.status === 'rejected' ? `Battery models: ${apiError(modelsResult.reason)}` : '',
    ].filter(Boolean).join(' · '));
    setInventoryReady(batteries.status === 'fulfilled' && modelsResult.status === 'fulfilled');
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);
  const models = useMemo(() => Array.from(new Set([
    ...catalog.map(m => m.name), ...available.map(b => b.battery_model ?? '').filter(Boolean),
  ])).sort(), [catalog, available]);
  const modelSummary = useMemo(() => models.map(name => ({
    name, quantity: available.filter(b => b.battery_model === name).length,
  })), [models, available]);
  const shown = modelSummary.filter(item => {
    if (modelFilter !== 'ALL' && item.name !== modelFilter) return false;
    const match = search.trim().toLowerCase();
    return !match || item.name.toLowerCase().includes(match) || available.some(b => b.battery_model === item.name
      && b.id.toLowerCase().includes(match));
  });
  const existingQuantity = modelSummary.find(item => item.name === model)?.quantity ?? 0;
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 30;
  const activeModel = catalog.some(m => m.name === model && m.is_active);

  function openCreate(selectedModel?: string) {
    setModel(selectedModel && models.includes(selectedModel) ? selectedModel : models.includes(modelHint) ? modelHint : catalog.find(m => m.is_active)?.name ?? '');
    setQuantity(1); setError(''); setNotice(''); setCreating(true);
  }
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !activeModel || !validQuantity) {
      setError('Select an active battery model and enter a quantity from 1 to 30.'); return;
    }
    if (!(await confirmAction({ title: 'Add batteries', message: `Add ${quantity} ${model} ${quantity === 1 ? 'battery' : 'batteries'} to the Admin warehouse?`, confirmLabel: 'Confirm Addition' }))) return;
    setSaving(true); setError('');
    try {
      await adminOperationsApi.createBattery({
        quantity, battery_model: model,
        status: 'Active', charge_level_pct: 100,
      });
      setCreating(false); setExpandedModel(model); setNotice(`${quantity} ${model} batteries registered successfully.`);
      await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!removing || saving || !removalReason.trim()) return;
    // OpenAPI DELETE /batteries/{id} has NO reason field. Do not pretend the reason is recorded.
    if (!(await confirmAction({ title: 'Remove battery', message: `Permanently remove battery ${removing.id}? The removal reason cannot be saved.`, confirmLabel: 'Confirm Removal' }))) return;
    setSaving(true); setError('');
    try {
      await adminOperationsApi.deleteBattery(removing.id);
      setRemoving(null); setRemovalReason(''); setNotice(`Battery ${removing.id} removed successfully. The removal reason was not saved.`);
      await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  const expandedUnits = available.filter(b => b.battery_model === expandedModel).sort((a, b) => a.id.localeCompare(b.id));
  // return <AdminPageShell title="New Batteries" actions={<ActionButton icon="plus" onClick={() => openCreate()}>Add batteries</ActionButton>}></AdminPageShell>
  return <AdminPageShell title="New Batteries">
    {validReturn && <div className="mb-3"><Link className="text-button" to={validReturn}>Back to replacement request</Link></div>}
    {!loading && inventoryReady && <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <CompactMetric label="Total new batteries" value={available.length} note="Unassigned · available for supply" icon={BatteryCharging} />
      <CompactMetric label="Battery models" value={modelSummary.filter((item) => item.quantity > 0).length} note="Models currently in stock" icon={Box} />
      <CompactMetric label="Added this week" value="—" note="Registration dates unavailable" icon={CalendarDays} />
    </div>}
    {notice && <p className="mb-3 text-sm text-green-600" role="status">{notice}</p>}
    {loading && <OperatorLoadingState label="Loading new batteries…" />}
    {error && !creating && !removing && <p role="alert" className="mb-3 text-xs text-red-500">{error} <button type="button" className="text-button" onClick={() => { invalidateAdminReads(); void refresh(); }}>Retry</button></p>}
    {/* Browser-only demo stock is intentionally disabled. This table reads the Backend catalog and physical battery units. */}
    {!loading && inventoryReady && <OperatorPanel className="flush-panel">
      <AdminToolbar
        searchValue={search} onSearchChange={setSearch}
        placeholder="Search Battery Model or Battery ID…"
        filters={<AdminSelect aria-label="Filter by battery model" value={modelFilter} onChange={(event) => setModelFilter(event.target.value)}>
          <option value="ALL">All battery models</option>{models.map((name) => <option key={name} value={name}>{name}</option>)}
        </AdminSelect>}
        meta={`${shown.length} of ${modelSummary.length} battery models`}
      />
      <div className="table-wrap"><OperatorTable className="admin-pinned-actions"><TableHeader><TableRow><TableHead>Battery Model</TableHead><TableHead>Current Quantity</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>{shown.map((item) => <TableRow key={item.name}>
          <TableCell><strong>{item.name}</strong></TableCell>
          <TableCell><strong className={item.quantity === 0 ? 'text-red-600' : undefined}>{item.quantity}</strong>{item.quantity === 0 && <small className="!text-red-600">Out of stock</small>}</TableCell>
          <TableCell><div className="flex flex-wrap items-center gap-2">
            {/* <ActionButton variant="ghost" onClick={() => setExpandedModel(expandedModel === item.name ? null : item.name)}>
              {expandedModel === item.name ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              View units
            </ActionButton> */}
            <ActionButton variant="secondary" onClick={() => openCreate(item.name)}>Add Quantity</ActionButton>
          </div></TableCell>
        </TableRow>)}
          {!loading && !error && !shown.length && <TableRow><TableCell colSpan={3} className="py-8 text-center text-[var(--admin-muted)]">No matching battery models.</TableCell></TableRow>}
        </TableBody></OperatorTable></div>
    </OperatorPanel>}
    {!loading && inventoryReady && expandedModel && <OperatorPanel className="flush-panel mt-4">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-border)] p-4">
        <div><strong>{expandedModel}</strong><p className="text-xs text-[var(--admin-muted)]">Individual Battery IDs · {expandedUnits.length} unit(s)</p></div>
        <ActionButton variant="secondary" onClick={() => setExpandedModel(null)}>Close</ActionButton>
      </div>
      <div className="table-wrap"><OperatorTable className="admin-pinned-actions"><TableHeader><TableRow><TableHead>Battery ID</TableHead><TableHead>Created on</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {expandedUnits.map((battery) => <TableRow key={battery.id}>
          <TableCell><strong>{battery.id}</strong></TableCell>
          <TableCell>{'—'}</TableCell>
          <TableCell><div className="flex items-center gap-2">
            <button type="button" aria-label={`Remove ${battery.id}`} title="Remove new battery" onClick={() => { setError(''); setNotice(''); setRemovalReason(''); setRemoving(battery); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] text-red-500 hover:border-red-400"><Trash2 size={15} /></button>
          </div></TableCell>
        </TableRow>)}
        {!loading && !error && expandedUnits.length === 0 && <TableRow><TableCell colSpan={3} className="p-5 text-center text-[var(--admin-muted)]">No new units in this model yet.</TableCell></TableRow>}
      </TableBody></OperatorTable></div>
    </OperatorPanel>}

    <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
      {creating && <DialogContent className="new-batteries-quantity-dialog"><form onSubmit={register}>
        <div className="new-batteries-quantity-header">
          <DialogTitle className="text-lg font-semibold">Add New Batteries</DialogTitle>
        </div>
        <div className="new-batteries-quantity-body">
          <label className="block text-sm"><span>Battery Model <span className="text-red-500">*</span></span>
            <AdminSelect required className={`${field} mt-2`} value={model} onChange={(event) => setModel(event.target.value)}>
              <option value="">Select Battery Model</option>{catalog.filter(m => m.is_active).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </AdminSelect>
          </label>
          <div className="new-batteries-quantity-fields">
            <label><span>Current Quantity</span><input className="new-batteries-quantity-input is-readonly" type="text" readOnly tabIndex={-1} value={existingQuantity} /></label>
            <label><span>Quantity to Add <span className="text-red-500">*</span></span><input className="new-batteries-quantity-input" type="number" required min={1} max={30} step={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
          </div>
          <div className="new-batteries-quantity-result"><span>Quantity after addition</span><strong>{validQuantity ? `${existingQuantity + quantity} units` : '—'}</strong></div>
          {error && <p role="alert" className="new-batteries-quantity-error">{error}</p>}
        </div>
        <div className="new-batteries-quantity-footer"><ActionButton variant="secondary" onClick={() => setCreating(false)}>Cancel</ActionButton><ActionButton type="submit" disabled={saving || !activeModel || !validQuantity}>{saving ? 'Saving…' : 'Confirm Addition'}</ActionButton></div>
      </form></DialogContent>}
    </Dialog>

    <Dialog open={Boolean(removing)} onOpenChange={(open) => { if (!open) { setRemoving(null); setRemovalReason(''); setError(''); } }}>
      {removing && <DialogContent className="new-batteries-quantity-dialog"><div className="new-batteries-quantity-header"><DialogTitle className="text-lg font-semibold">Remove {removing.id}?</DialogTitle><p>Removal is permanent. The reason will not be saved.</p></div>
        <div className="new-batteries-quantity-body"><label className="block text-sm" htmlFor="new-battery-removal-reason"><span>Reason for removal <span className="text-red-500">*</span></span>
          <textarea id="new-battery-removal-reason" className={`${field} mt-2 !h-auto resize-none py-2`} rows={3} maxLength={500} required placeholder="Enter reason…" value={removalReason} onChange={(event) => setRemovalReason(event.target.value)} /></label>
          {error && <p role="alert" className="new-batteries-quantity-error">{error}</p>}
        </div>
        <div className="new-batteries-quantity-footer"><ActionButton variant="secondary" onClick={() => { setRemoving(null); setRemovalReason(''); setError(''); }}>Cancel</ActionButton><ActionButton variant="danger" disabled={!removalReason.trim() || saving} onClick={() => void remove()}>Remove Battery</ActionButton></div>
      </DialogContent>}
    </Dialog>
  </AdminPageShell>;
}
