import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BatteryCharging, Box, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from "../../components/AdminDialogContent";
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
  seedNewBatteriesDemo,
} from '../../services/adminNewBatterySupply';
import type { AdminBattery } from '../../types';
import '../../components/AdminInventoryDialog.css';

const adminDialogFont = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const field = 'h-10 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-sm text-[var(--admin-text)] outline-none focus:border-[#FF6B00]';

function thisWeekStart(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function CompactMetric({ label, value, note, icon: Icon }: {
  label: string; value: number; note: string; icon: typeof BatteryCharging;
}) {
  return <div
    className="min-w-0 px-4 py-3"
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #DDE2E8',
      borderRadius: 12,
      boxShadow: '0 8px 22px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.05)',
      minHeight: 112,
    }}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 text-xs font-medium text-[var(--admin-muted)]">{label}</span>
      <Icon size={18} strokeWidth={1.8} className="shrink-0 text-[#FF6B00]" aria-hidden="true" />
    </div>
    <strong className="mt-1 block text-2xl font-bold leading-tight text-[var(--admin-text)]">{value}</strong>
    <span className="mt-0.5 block text-[11px] text-[var(--admin-subtle)]">{note}</span>
  </div>;
}

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
  const [serials, setSerials] = useState('');
  const [editing, setEditing] = useState<AdminBattery | null>(null);
  const [editModel, setEditModel] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [removing, setRemoving] = useState<AdminBattery | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener('admin-data-updated', handler);
    // Populate mock rows exactly once, only when this browser has no existing
    // Admin-owned new batteries. No existing Hub battery or request is touched.
    try { seedNewBatteriesDemo(); } catch { /* storage unavailable: show the existing data */ }
    return () => window.removeEventListener('admin-data-updated', handler);
  }, []);

  const available = useMemo(() => getAvailableNewBatteries(), [version]);
  const models = [...new Set(getAdminBatteries().map((battery) => battery.model).filter(Boolean))].sort();
  const availableModels = [...new Set(available.map((battery) => battery.model))].sort();
  const shown = available.filter((battery) =>
    (modelFilter === 'ALL' || battery.model === modelFilter) &&
    `${battery.id} ${battery.serialNumber} ${battery.model}`.toLowerCase().includes(search.toLowerCase().trim()),
  ).sort((a, b) => (b.adminReceivedAt ?? '').localeCompare(a.adminReceivedAt ?? '') || a.id.localeCompare(b.id));
  const startOfWeek = thisWeekStart().getTime();
  const addedThisWeek = available.filter((battery) => {
    if (!battery.adminReceivedAt) return false;
    const receivedAt = Date.parse(battery.adminReceivedAt);
    return receivedAt >= startOfWeek && receivedAt <= Date.now();
  }).length;
  const serialCount = serials.split(/\r?\n/).filter((serial) => serial.trim()).length;
  const referencePrice = getNewBatteryReferenceUnitCostVnd(model);

  const openCreate = () => {
    setModel(models.includes(modelHint) ? modelHint : (models[0] ?? ''));
    setSerials('');
    setNotice(''); setError(''); setCreating(true);
  };
  const register = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const entries = registerAdminNewBatteries(model, serials.split(/\r?\n/));
      setCreating(false); setError('');
      setNotice(`${entries.length} new battery${entries.length === 1 ? '' : ' units'} registered (${model}): ${entries.map((battery) => battery.id).join(', ')}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not register new batteries.'); }
  };
  const openEdit = (battery: AdminBattery) => {
    setEditModel(battery.model); setEditSerial(battery.serialNumber);
    setNotice(''); setError(''); setEditing(battery);
  };
  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return;
    try {
      editAvailableNewBattery(editing.id, editModel, editSerial);
      setEditing(null); setError(''); setNotice(`${editing.id} updated.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update battery.'); }
  };
  const remove = () => {
    if (!removing) return;
    try {
      removeAvailableNewBattery(removing.id, removalReason);
      setRemoving(null); setRemovalReason(''); setError(''); setNotice(`${removing.id} removed from New Batteries.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove battery.'); }
  };

  return <AdminPageShell
    title="New Batteries"
    actions={<ActionButton icon="plus" onClick={openCreate}>Create new battery</ActionButton>}
  >
    {validReturn && <div className="mb-3"><Link className="text-button" to={validReturn}>Back to replacement request</Link></div>}

    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <CompactMetric label="Total new batteries" value={available.length} note="Available for supply" icon={BatteryCharging} />
      <CompactMetric label="Battery models" value={new Set(available.map((battery) => battery.model)).size} note="Models currently registered" icon={Box} />
      <CompactMetric label="Added this week" value={addedThisWeek} note="Registered by Admin" icon={CalendarDays} />
    </div>

    {notice && <p className="mb-3 text-sm text-green-600" role="status">{notice}</p>}
    <OperatorPanel className="flush-panel">
      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search by Battery ID, model or serial number…"
        filters={<select aria-label="Filter by battery model" value={modelFilter} onChange={(event) => setModelFilter(event.target.value)}>
          <option value="ALL">All battery models</option>
          {availableModels.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>}
        meta={`${shown.length} of ${available.length} new batteries`}
      />
      <div className="table-wrap"><table>
        <thead><tr>
          <th>Battery ID</th><th>Battery model</th><th>Serial number</th><th>Created on</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {shown.map((battery) => <tr key={battery.id}>
            <td><strong>{battery.id}</strong></td>
            <td>{battery.model}</td>
            <td>{battery.serialNumber}</td>
            <td>{battery.adminReceivedAt ? new Date(battery.adminReceivedAt).toLocaleString('en-GB') : '—'}</td>
            <td>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={`Edit ${battery.id}`} title="Edit battery" onClick={() => openEdit(battery)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:border-[#FF6B00] hover:text-[#FF6B00]">
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Remove ${battery.id}`} title="Remove new battery" onClick={() => { setNotice(''); setError(''); setRemovalReason(''); setRemoving(battery); }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] text-red-500 hover:border-red-400">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>)}
          {!shown.length && <tr><td colSpan={5} className="py-8 text-center text-[var(--admin-muted)]">No new batteries found.</td></tr>}
        </tbody>
      </table></div>
    </OperatorPanel>

    <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
      {creating && <DialogContent className="admin-inventory-dialog" style={{ fontFamily: adminDialogFont }}><form onSubmit={register}>
        <div className="admin-inventory-dialog__header border-b border-border p-5">
          <DialogTitle asChild><div className="text-lg font-semibold leading-snug" style={{ fontFamily: adminDialogFont, fontSize: 18, fontWeight: 600 }}>Create new battery</div></DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground">Enter one serial number per battery.</p>
        </div>
        <div className="admin-inventory-dialog__body space-y-4 p-5">
          <label className="block text-sm"><span>Battery model</span>
            <select required className={`${field} mt-2`} value={model} onChange={(event) => setModel(event.target.value)}>
              {models.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="block text-sm"><span>Serial numbers (one per line)</span>
            <textarea required rows={4} className={`${field} mt-2 !h-auto py-2`} placeholder={'SERIAL-001\nSERIAL-002'} value={serials} onChange={(event) => setSerials(event.target.value)} />
          </label>
          <div className="text-xs text-[var(--admin-muted)]">Battery IDs are generated automatically · {serialCount} serial(s)</div>
          <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4 text-sm">
            <strong className="block mb-3">Acquisition Cost <span className="float-right text-xs font-normal text-[var(--admin-muted)]">Auto calculated · demo</span></strong>
            <div className="flex justify-between gap-2"><span>Reference Unit Price</span><strong>{referencePrice > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(referencePrice) : 'Not configured'}</strong></div>
            <div className="mt-3 flex justify-between gap-2 border-t border-[var(--admin-border)] pt-3"><span>Total Recorded Cost</span><strong>{referencePrice > 0 && serialCount > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(referencePrice * serialCount) : '—'}</strong></div>
            <p className="mt-2 text-xs text-[var(--admin-muted)]">One internal recorded cost for this registration batch. No real bank transfer or supplier payment.</p>
          </div>
          {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        </div>
        <div className="admin-inventory-dialog__footer form-actions border-t border-border p-5">
          <ActionButton variant="secondary" onClick={() => setCreating(false)}>Cancel</ActionButton>
          <ActionButton type="submit" disabled={!model || serialCount < 1 || referencePrice <= 0}>Register batteries</ActionButton>
        </div>
      </form></DialogContent>}
    </Dialog>

    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
      {editing && <DialogContent className="admin-inventory-dialog" style={{ fontFamily: adminDialogFont }}><form onSubmit={saveEdit}>
        <div className="admin-inventory-dialog__header border-b border-border p-5"><DialogTitle asChild><div className="text-lg font-semibold leading-snug" style={{ fontFamily: adminDialogFont, fontSize: 18, fontWeight: 600 }}>Edit {editing.id}</div></DialogTitle></div>
        <div className="admin-inventory-dialog__body space-y-4 p-5">
          <label className="block text-sm"><span>Battery model</span>
            <select className={`${field} mt-2`} value={editModel} onChange={(event) => setEditModel(event.target.value)}>
              {models.map((name) => <option key={name} value={name}>{name}</option>)}
            </select></label>
          <label className="block text-sm"><span>Serial number</span>
            <input required className={`${field} mt-2`} value={editSerial} onChange={(event) => setEditSerial(event.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="admin-inventory-dialog__footer form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={() => setEditing(null)}>Cancel</ActionButton><ActionButton type="submit">Save changes</ActionButton></div>
      </form></DialogContent>}
    </Dialog>

    <Dialog open={Boolean(removing)} onOpenChange={(open) => { if (!open) { setRemoving(null); setRemovalReason(''); setError(''); } }}>
      {removing && <DialogContent className="admin-inventory-dialog" style={{ fontFamily: adminDialogFont }}><div className="admin-inventory-dialog__form">
        <div className="admin-inventory-dialog__header border-b border-border p-5"><DialogTitle asChild><div className="text-lg font-semibold leading-snug" style={{ fontFamily: adminDialogFont, fontSize: 18, fontWeight: 600 }}>Remove {removing.id}?</div></DialogTitle></div>
        <div className="admin-inventory-dialog__body px-5 py-4">
        <label className="mt-4 block text-sm font-medium text-[var(--admin-text)]" htmlFor="new-battery-removal-reason" style={{ fontFamily: adminDialogFont }}>Reason for removal <span className="text-red-500">*</span></label>
        <textarea
          id="new-battery-removal-reason"
          style={{ fontFamily: adminDialogFont }}
          className={`${field} mt-2 !h-auto resize-none py-2`}
          rows={3}
          maxLength={500}
          required
          placeholder="Enter the reason for removing this battery..."
          value={removalReason}
          onChange={(event) => setRemovalReason(event.target.value)}
        />
        {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
        <div className="admin-inventory-dialog__footer border-t border-border px-5 py-4">
          <ActionButton variant="secondary" style={{ fontFamily: adminDialogFont }} onClick={() => { setRemoving(null); setRemovalReason(''); setError(''); }}>Cancel</ActionButton>
          <ActionButton variant="danger" style={{ fontFamily: adminDialogFont }} disabled={!removalReason.trim()} onClick={remove}>Remove battery</ActionButton>
        </div>
      </div></DialogContent>}
    </Dialog>
  </AdminPageShell>;
}
