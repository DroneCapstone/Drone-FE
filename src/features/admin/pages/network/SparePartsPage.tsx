import { AdminSelect } from '../../components/AdminSelect';
import { useSearchParams } from 'react-router-dom';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../../components/ui/DropdownMenu';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminOperationsApi, apiError, type HubApi, type PartCategoryApi, type StockApi } from '../../api/adminOperationsApi';
import { SparePartActionDialog, SparePartsBulkReceiveDialog, type StockAction } from '../../components/SparePartsStockDialogs';
import '../../components/AdminInventoryDialog.css';
import './SparePartsQuantityDialog.css';

const TYPES = ['Motor', 'Propeller', 'ESC', 'FlightController', 'Cable', 'Frame', 'Sensor', 'Battery', 'Camera', 'Landing Gear', 'Gimbal', 'Charger', 'Maintenance Kit', 'Other'];
type Draft = { name: string; categoryType: string; compatible: string; active: boolean };
const blankDraft = (): Draft => ({ name: '', categoryType: 'Other', compatible: '', active: true });

/** Inventory is per Hub in Backend. The former browser-local Spare Parts demo is intentionally disabled; no mock fallback. */
export function SparePartsPage() {
  const [params] = useSearchParams();
  const initialFilter = params.get('stock') === 'LOW' ? 'LOW' : 'ALL';
  const [parts, setParts] = useState<PartCategoryApi[]>([]);
  const [stocks, setStocks] = useState<StockApi[]>([]);
  const [hubs, setHubs] = useState<HubApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  const [selectedHub, setSelectedHub] = useState('all');
  const [editing, setEditing] = useState<PartCategoryApi | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [restocking, setRestocking] = useState<PartCategoryApi | null>(null);
  const [restockHub, setRestockHub] = useState('');
  const [added, setAdded] = useState(1);
  const [stockAction, setStockAction] = useState<{ action: StockAction; part: PartCategoryApi } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [categories, inventory, hs] = await Promise.all([
        adminOperationsApi.categories(), adminOperationsApi.stocks(), adminOperationsApi.hubs(),
      ]);
      setParts(categories); setStocks(inventory); setHubs(hs); setInventoryReady(true); setError('');
    } catch (cause) { setInventoryReady(false); setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const partQuantity = (part: PartCategoryApi) => stocks
    .filter((item) => item.part_category_id === part.id && (selectedHub === 'all' || String(item.hub_id) === selectedHub))
    .reduce((sum, item) => sum + item.quantity, 0);
  const low = (part: PartCategoryApi) => {
    const rows = stocks.filter((item) => item.part_category_id === part.id && (selectedHub === 'all' || String(item.hub_id) === selectedHub));
    return rows.some((item) => item.is_low_stock || (Number.isFinite(item.min_stock_threshold) && item.quantity <= item.min_stock_threshold)) || (rows.length > 0 && rows.every((item) => item.quantity === 0));
  };
  const visible = useMemo(() => parts.filter((part) => {
    const ok = `${part.id} ${part.name} ${part.category_type} ${(part.compatible_drone_models ?? []).join(' ')}`.toLowerCase().includes(query.toLowerCase());
    if (!ok) return false;
    if (filter === 'LOW') return low(part);
    if (filter === 'OUT') return partQuantity(part) === 0;
    if (filter === 'ACTIVE') return part.is_active !== false;
    if (filter === 'INACTIVE') return part.is_active === false;
    return true;
  }), [parts, stocks, query, filter, selectedHub]);
  const currentFor = (part: PartCategoryApi, hubId: number) => stocks.find((s) => s.part_category_id === part.id && s.hub_id === hubId)?.quantity ?? 0;
  const chosenHub = hubs.find((h) => String(h.id) === restockHub);
  const selectedStock = restocking && chosenHub ? stocks.find(s => s.part_category_id === restocking.id && s.hub_id === chosenHub.id) : undefined;
  const selectedLow = !!selectedStock && (selectedStock.is_low_stock || (Number.isFinite(selectedStock.min_stock_threshold) && selectedStock.quantity <= selectedStock.min_stock_threshold));
  const validQuantity = Number.isSafeInteger(added) && added > 0 && chosenHub?.status?.toUpperCase() === 'ACTIVE';

  function openEdit(part?: PartCategoryApi) {
    setEditing(part ?? 'new'); setError(''); setNotice('');
    setDraft(part ? { name: part.name, categoryType: part.category_type, compatible: (part.compatible_drone_models ?? []).join(', '), active: part.is_active !== false } : blankDraft());
  }
  function openRestock(part: PartCategoryApi) {
    setRestocking(part); setRestockHub(selectedHub !== 'all' ? selectedHub : String(hubs.find((h) => h.status?.toUpperCase() === 'ACTIVE')?.id ?? ''));
    setAdded(1); setError(''); setNotice('');
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!editing || saving) return;
    if (!draft.name.trim()) { setError('Enter a valid component name.'); return; }
    const models = draft.compatible.split(',').map((v) => v.trim()).filter(Boolean);
    setSaving(true); setError('');
    try {
      if (editing === 'new') {
        await adminOperationsApi.createCategory({ name: draft.name.trim(), category_type: draft.categoryType, compatible_drone_models: models });
      } else {
        await adminOperationsApi.updateCategory(editing.id, { name: draft.name.trim(), compatible_drone_models: models, is_active: draft.active });
      }
      setEditing(null); setNotice('Spare part category saved successfully.'); await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  async function restock(event: FormEvent) {
    event.preventDefault(); if (!restocking || !chosenHub || !validQuantity || saving) return;
    setSaving(true); setError('');
    try {
      await adminOperationsApi.receiveStock({ hub_id: chosenHub.id, part_category_id: restocking.id, quantity: added, note: 'Admin stock intake (received physically)' });
      setRestocking(null); setNotice(`Received ${added} unit(s) of ${restocking.name} at ${chosenHub.name}.`);
      await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }

  return <AdminPageShell title="Spare Parts" description="" actions={<>
    {/* <Link className="button button-secondary" to="/admin/replacement/requests?type=PART">Replacement records</Link> */}
    {/* <ActionButton variant="secondary" onClick={() => setBulkOpen(true)}>Bulk Receive</ActionButton> */}
    {/* <ActionButton icon="plus" onClick={() => openEdit()}>Add spare part</ActionButton> */}
  </>}>
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => void refresh()}>Retry</button></p>}
    {notice && <p role="status" className="mb-3 text-sm text-green-600">{notice}</p>}
    {loading && <OperatorLoadingState label="Loading spare parts…" />}
    {!loading && inventoryReady && <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search part, component or drone model…" filters={<>
        <AdminSelect value={selectedHub} onChange={(event) => setSelectedHub(event.target.value)} aria-label="Inventory Hub"><option value="all">All hubs (total stock)</option>{hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</AdminSelect>
        <AdminSelect value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Stock filter"><option value="ALL">All parts</option><option value="LOW">Low quantity</option><option value="OUT">Out of parts</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></AdminSelect>
      </>} meta={`${visible.length} of ${parts.length} part categories`} />
      <div className="table-wrap"><table><thead><tr><th>Part ID</th><th>Component</th><th>Drone model</th><th>Quantity</th><th>Actions</th></tr></thead><tbody>
        {visible.map((part) => <tr key={part.id}>
          <td><strong>PART-{part.id}</strong></td>
          <td><strong>{part.name}</strong></td>
          <td>{(part.compatible_drone_models ?? []).join(', ') || '—'}</td>
          <td><strong className={partQuantity(part) === 0 || low(part) ? 'text-red-600' : ''}>{partQuantity(part)}</strong>{partQuantity(part) === 0 ? <small className="!text-red-600">Out of stock</small> : low(part) ? <small className="!text-red-600">{selectedHub === 'all' ? 'Low stock at one or more Hubs' : 'Low stock'}</small> : null}</td>
          <td><div className="flex flex-wrap items-center gap-2"><ActionButton variant="ghost" onClick={() => openEdit(part)}>Edit</ActionButton><ActionButton variant="secondary" disabled={part.is_active === false} onClick={() => openRestock(part)}>Add quantity</ActionButton>
            <DropdownMenu><DropdownMenuTrigger className="button button-ghost" type="button">More ▾</DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {([['TRANSFER', 'Transfer'], ['ADJUST', 'Adjust Stock'], ['DISCARD', 'Discard'], ['THRESHOLD', 'Set Threshold']] as const).map(([action, label]) =>
                  <DropdownMenuItem key={action} onClick={() => setStockAction({ action, part })}>{label}</DropdownMenuItem>)}
              </DropdownMenuContent></DropdownMenu></div></td>
        </tr>)}
        {!loading && !error && visible.length === 0 && <tr><td colSpan={5}>No spare part categories found.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>}

    <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>{editing && <DialogContent className="admin-inventory-dialog"><form onSubmit={(e) => void save(e)}>
      <div className="admin-inventory-dialog__header border-b border-border p-5"><DialogTitle className="text-lg font-semibold">{editing === 'new' ? 'Add spare part category' : 'Edit spare part category'}</DialogTitle></div>
      <div className="admin-inventory-dialog__body fields two p-5">
        <label><span>Component name</span><input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <label><span>Component type</span><AdminSelect value={draft.categoryType} disabled={editing !== 'new'} onChange={(e) => setDraft({ ...draft, categoryType: e.target.value })}>{TYPES.map((v) => <option key={v}>{v}</option>)}</AdminSelect></label>
        <label><span>Compatible Drone models (comma separated)</span><input value={draft.compatible} onChange={(e) => setDraft({ ...draft, compatible: e.target.value })} /></label>
        {editing !== 'new' && <label><span>Status</span><AdminSelect value={draft.active ? 'ACTIVE' : 'INACTIVE'} onChange={(e) => setDraft({ ...draft, active: e.target.value === 'ACTIVE' })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></AdminSelect></label>}
      </div>
      {error && <p role="alert" className="mx-5 text-xs text-red-500">{error}</p>}
      <div className="admin-inventory-dialog__footer form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={() => setEditing(null)}>Cancel</ActionButton><ActionButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save category'}</ActionButton></div>
    </form></DialogContent>}</Dialog>

    <Dialog open={!!restocking} onOpenChange={(open) => !open && setRestocking(null)}>{restocking && <DialogContent className="admin-inventory-dialog spare-quantity-dialog"><form onSubmit={(e) => void restock(e)}>
      <div className="admin-inventory-dialog__header spare-quantity-header"><DialogTitle>Add Quantity</DialogTitle><p>{restocking.name} · PART-{restocking.id}</p><span className="spare-quantity-model">{(restocking.compatible_drone_models ?? []).join(', ') || 'All compatible models'}</span></div>
      <div className="admin-inventory-dialog__body spare-quantity-body">
        <label className="block text-xs font-semibold mb-3"><span>Receiving Hub *</span><AdminSelect className="spare-quantity-input mt-2 w-full" required value={restockHub} onChange={(e) => setRestockHub(e.target.value)}><option value="">Select receiving Hub</option>{hubs.filter((h) => h.status?.toUpperCase() === 'ACTIVE').map((h) => <option value={h.id} key={h.id}>{h.name}</option>)}</AdminSelect></label>
        <div className="spare-quantity-fields">
          <label><span>Current quantity (at Hub)</span><input className={`spare-quantity-input spare-quantity-input--readonly${selectedLow ? ' is-low-stock' : ''}`} readOnly value={chosenHub ? currentFor(restocking, chosenHub.id) : '—'} /></label>
          <label><span>Quantity to Add *</span><input className="spare-quantity-input" type="number" min={1} step={1} required value={added} onChange={(e) => setAdded(Number(e.target.value))} /></label>
        </div>
        {selectedLow && <p role="status" className="spare-quantity-low-stock">Low stock{Number.isFinite(selectedStock?.min_stock_threshold) ? ` — Minimum stock: ${selectedStock?.min_stock_threshold} units.` : '.'}</p>}
        <div className="spare-quantity-result"><span>Quantity after addition (at Hub)</span><strong>{validQuantity ? `${currentFor(restocking, chosenHub!.id) + added} units` : '—'}</strong></div>
        {error && <p role="alert" className="spare-quantity-error">{error}</p>}
      </div>
      <div className="admin-inventory-dialog__footer spare-quantity-footer"><ActionButton variant="secondary" onClick={() => setRestocking(null)}>Cancel</ActionButton><ActionButton type="submit" disabled={saving || !validQuantity}>{saving ? 'Saving…' : 'Confirm Addition'}</ActionButton></div>
    </form></DialogContent>}</Dialog>
    <SparePartActionDialog part={stockAction?.part ?? null} action={stockAction?.action ?? null} defaultHub={selectedHub} hubs={hubs} stocks={stocks} onClose={() => setStockAction(null)} onSaved={refresh} />
    <SparePartsBulkReceiveDialog open={bulkOpen} hubs={hubs} parts={parts} defaultHub={selectedHub} onClose={() => setBulkOpen(false)} onSaved={refresh} />
  </AdminPageShell>;
}
