import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from './AdminDialogContent';
import { adminOperationsApi, apiError, type HubApi, type PartCategoryApi, type StockApi } from '../api/adminOperationsApi';
import './AdminInventoryDialog.css';

export type StockAction = 'TRANSFER' | 'ADJUST' | 'DISCARD' | 'THRESHOLD';
type Props = { part: PartCategoryApi | null; action: StockAction | null; defaultHub: string; hubs: HubApi[]; stocks: StockApi[]; onClose: () => void; onSaved: () => Promise<void> };
const isInt = (n: number) => Number.isSafeInteger(n);

/** Contextual stock actions: this is the only existing Admin page receiving new action controls. */
export function SparePartActionDialog({ part, action, defaultHub, hubs, stocks, onClose, onSaved }: Props) {
  const [hub, setHub] = useState(defaultHub);
  const [destination, setDestination] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const activeHubs = hubs.filter(h => h.status?.toUpperCase() === 'ACTIVE');
  useEffect(() => { if (!part || !action) return;
    const initialHub = defaultHub && defaultHub !== 'all' ? defaultHub : String(activeHubs[0]?.id ?? '');
    setHub(initialHub); setDestination(''); setQuantity(action === 'THRESHOLD' ? (stocks.find(s => s.hub_id === Number(initialHub) && s.part_category_id === part.id)?.min_stock_threshold ?? 0) : 1);
    setNote(''); setError('');
    // Values reset only when opening a different part/action, not when typing in the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part?.id, action]);
  const source = stocks.find(s => s.hub_id === Number(hub) && s.part_category_id === part?.id);
  const available = source?.quantity ?? 0;
  const affected = action === 'ADJUST' ? available + quantity : action === 'THRESHOLD' ? available : available - quantity;
  const valid = !!part && !!action && activeHubs.some(h => String(h.id) === hub) && isInt(quantity)
    && (action === 'THRESHOLD' ? quantity >= 0
      : action === 'ADJUST' ? quantity !== 0 && affected >= 0
      : quantity > 0 && quantity <= available)
    && (action !== 'TRANSFER' || (destination !== hub && activeHubs.some(h => String(h.id) === destination)));
  const label = { TRANSFER: 'Transfer', ADJUST: 'Adjust Stock', DISCARD: 'Discard', THRESHOLD: 'Set Threshold' }[action ?? 'TRANSFER'];
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!part || !action || !valid || saving) return;
    if (!window.confirm(`${label} ${part.name} at the selected Hub? This updates inventory and records the change.`)) return;
    setSaving(true); setError('');
    try {
      if (action === 'TRANSFER') await adminOperationsApi.transferStock({ from_hub_id: Number(hub), to_hub_id: Number(destination), part_category_id: part.id, quantity, ...(note.trim() ? { note: note.trim() } : {}) });
      if (action === 'ADJUST') await adminOperationsApi.adjustStock(Number(hub), { part_category_id: part.id, quantity_delta: quantity, reason: 'Adjust', ...(note.trim() ? { note: note.trim() } : {}) });
      if (action === 'DISCARD') await adminOperationsApi.discardStock(Number(hub), { part_category_id: part.id, quantity, ...(note.trim() ? { note: note.trim() } : {}) });
      if (action === 'THRESHOLD') await adminOperationsApi.setStockThreshold(Number(hub), { part_category_id: part.id, min_stock_threshold: quantity });
      await onSaved(); onClose();
    } catch (e) { setError(apiError(e)); } finally { setSaving(false); }
  }
  return <Dialog open={!!part && !!action} onOpenChange={open => { if (!open && !saving) onClose(); }}>
    {part && action && <DialogContent className="admin-inventory-dialog"><form onSubmit={e => void submit(e)}>
      <div className="admin-inventory-dialog__header border-b border-border p-5"><DialogTitle className="text-lg font-semibold">{label}</DialogTitle><p className="mt-1 text-xs text-muted-foreground">{part.name} · PART-{part.id}</p></div>
      <div className="admin-inventory-dialog__body fields two p-5">
        <label><span>{action === 'TRANSFER' ? 'From Hub' : 'Hub'} *</span><select value={hub} required onChange={e => { setHub(e.target.value); setDestination(''); }}><option value="">Select Hub</option>{activeHubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
        {action === 'TRANSFER' && <label><span>To Hub *</span><select value={destination} required onChange={e => setDestination(e.target.value)}><option value="">Select destination</option>{activeHubs.filter(h => String(h.id) !== hub).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>}
        <label><span>{action === 'THRESHOLD' ? 'Minimum stock threshold' : action === 'ADJUST' ? 'Quantity change (+ / −)' : 'Quantity'} *</span><input type="number" step={1} min={action === 'ADJUST' ? undefined : action === 'THRESHOLD' ? 0 : 1} required value={quantity} onChange={e => setQuantity(Number(e.target.value))}/></label>
        {action !== 'THRESHOLD' && <label><span>Note (optional)</span><input value={note} onChange={e => setNote(e.target.value)}/></label>}
        <p className="text-xs text-muted-foreground">Current Hub stock: <strong>{available}</strong> · Low-stock threshold: {source?.min_stock_threshold ?? 0}.</p>
        <p className="text-xs text-muted-foreground">{action === 'TRANSFER' ? `Source Hub after transfer: ${valid ? affected : '—'}` : action === 'ADJUST' || action === 'DISCARD' ? `Stock after operation: ${valid ? affected : '—'}` : `Warn when inventory is ≤ ${quantity}.`}</p>
      </div>
      {error && <p role="alert" className="px-5 text-xs text-red-500">{error}</p>}
      <div className="admin-inventory-dialog__footer form-actions border-t border-border p-5"><ActionButton variant="secondary" disabled={saving} onClick={onClose}>Cancel</ActionButton><ActionButton type="submit" disabled={!valid || saving}>{saving ? 'Saving…' : `Confirm ${label}`}</ActionButton></div>
    </form></DialogContent>}
  </Dialog>;
}

type BulkItem = { partId: string; quantity: number };
const blank = (): BulkItem => ({ partId: '', quantity: 1 });
export function SparePartsBulkReceiveDialog({ open, hubs, parts, defaultHub, onClose, onSaved }: { open: boolean; hubs: HubApi[]; parts: PartCategoryApi[]; defaultHub: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [hub, setHub] = useState('');
  const [rows, setRows] = useState<BulkItem[]>([blank(), blank()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const activeHubs = hubs.filter(h => h.status?.toUpperCase() === 'ACTIVE');
  useEffect(() => { if (!open) return; setHub(defaultHub !== 'all' ? defaultHub : String(activeHubs[0]?.id ?? '')); setRows([blank(), blank()]); setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const validRows = useMemo(() => rows.length > 0 && rows.every(r => parts.some(p => p.id === Number(r.partId) && p.is_active !== false) && isInt(r.quantity) && r.quantity > 0) && new Set(rows.map(r => r.partId)).size === rows.length, [rows, parts]);
  const valid = activeHubs.some(h => String(h.id) === hub) && validRows;
  function edit(index: number, patch: Partial<BulkItem>) { setRows(previous => previous.map((r, i) => i === index ? { ...r, ...patch } : r)); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!valid || saving) return;
    if (!window.confirm(`Receive ${rows.length} spare-part categories into ${activeHubs.find(h => String(h.id) === hub)?.name}?`)) return;
    setSaving(true); setError('');
    try {
      await adminOperationsApi.bulkReceive(Number(hub), rows.map(r => ({ part_category_id: Number(r.partId), quantity: r.quantity })));
      await onSaved(); onClose();
    } catch (e) { setError(apiError(e)); } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={next => { if (!next && !saving) onClose(); }}>
    <DialogContent className="admin-inventory-dialog"><form onSubmit={e => void submit(e)}>
      <div className="admin-inventory-dialog__header border-b border-border p-5"><DialogTitle className="text-lg font-semibold">Bulk Receive</DialogTitle></div>
      <div className="admin-inventory-dialog__body p-5 space-y-3">
        <label className="block text-sm"><span>Receiving Hub *</span><select className="mt-1 w-full" value={hub} required onChange={e => setHub(e.target.value)}><option value="">Select Hub</option>{activeHubs.map(h => <option value={h.id} key={h.id}>{h.name}</option>)}</select></label>
        {rows.map((row, i) => <div className="grid grid-cols-1 gap-2 rounded-md border border-border p-2 sm:grid-cols-2" key={i}>
          <label><span className="text-xs">Spare part *</span><select className="w-full" required value={row.partId} onChange={e => edit(i, { partId: e.target.value })}><option value="">Select part</option>{parts.filter(p => p.is_active !== false).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label><span className="text-xs">Quantity *</span><input className="w-full" type="number" min={1} step={1} required value={row.quantity} onChange={e => edit(i, { quantity: Number(e.target.value) })}/></label>
          <button type="button" className="text-button text-xs sm:col-span-2" disabled={rows.length === 1} onClick={() => setRows(old => old.filter((_, index) => i !== index))}>Remove item</button>
        </div>)}
        <button type="button" className="text-button" disabled={rows.length >= 20} onClick={() => setRows(old => [...old, blank()])}>+ Add another part</button>
      </div>
      {error && <p role="alert" className="px-5 text-xs text-red-500">{error}</p>}
      <div className="admin-inventory-dialog__footer form-actions border-t border-border p-5"><ActionButton variant="secondary" disabled={saving} onClick={onClose}>Cancel</ActionButton><ActionButton type="submit" disabled={!valid || saving}>{saving ? 'Saving…' : 'Confirm Receipt'}</ActionButton></div>
    </form></DialogContent>
  </Dialog>;
}
