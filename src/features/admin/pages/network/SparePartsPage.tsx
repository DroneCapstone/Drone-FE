import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ReceiptText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { getAdminDrones } from '../../services/adminStore';
import {
   addSparePartQuantity, CORE_SPARE_PART_CATEGORIES, getSpareParts, getSparePartReferenceUnitCostVnd, saveSparePart,
   type SparePart,
} from '../../services/prototypeWorkflow';
import { formatVnd } from '../../utils/adminDisplay';
import './SparePartsQuantityDialog.css';

const LOW_QUANTITY = 1;
const newPart = (): SparePart => ({
   id: '', name: CORE_SPARE_PART_CATEGORIES[0].name, compatibleModels: '',
   unitCostVnd: 0, active: true, quantity: 0,
});

export function SparePartsPage() {
   const [params] = useSearchParams();
   const [version, setVersion] = useState(0);
   const [query, setQuery] = useState('');
   const [filter, setFilter] = useState('ALL');
   const [editing, setEditing] = useState<SparePart | null>(null);
   const [editingMode, setEditingMode] = useState<'CREATE' | 'EDIT'>('CREATE');
   const [restockingId, setRestockingId] = useState<string | null>(null);
   const [added, setAdded] = useState(1);
   const [paid, setPaid] = useState(false);
   const [purchasePrice, setPurchasePrice] = useState(0);
   const [error, setError] = useState('');
   const [success, setSuccess] = useState('');

   useEffect(() => {
      const listener = () => setVersion((value) => value + 1);
      window.addEventListener('admin-data-updated', listener);
      return () => window.removeEventListener('admin-data-updated', listener);
   }, []);

   const parts = useMemo(() => getSpareParts(), [version]);
   const droneModels = [...new Set(getAdminDrones().map((drone) => drone.model).filter(Boolean))].sort();
   const restocking = parts.find((part) => part.id === restockingId);
   const restockUnitPrice = restocking ? getSparePartReferenceUnitCostVnd(restocking) : 0;
   const restockValid = Number.isSafeInteger(added) && added > 0
      && restockUnitPrice > 0 && Number.isSafeInteger(added * restockUnitPrice)
      && (!paid || (Number.isSafeInteger(purchasePrice) && purchasePrice > 0 && Number.isSafeInteger(added * purchasePrice)));
   const isNew = editingMode === 'CREATE';
   const visible = parts.filter((part) => {
      if (!`${part.id} ${part.name} ${part.compatibleModels}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (filter === 'LOW' && (!part.active || part.quantity > LOW_QUANTITY)) return false;
      if (filter === 'OUT' && (!part.active || part.quantity !== 0)) return false;
      if (filter === 'ACTIVE' && !part.active) return false;
      if (filter === 'INACTIVE' && part.active) return false;
      return true;
   });

   // The Replacement Records page can deep-link to the correct part to replenish.
   const restockQuery = params.get('restock');
   useEffect(() => {
      if (restockQuery && getSpareParts().some((part) => part.id === restockQuery)) {
         setRestockingId(restockQuery);
         setAdded(1);
         setPaid(false);
         setPurchasePrice(0);
         setError('');
      }
   }, [restockQuery]);

   const openAdd = () => {
      setEditingMode('CREATE'); setEditing(newPart()); setPaid(false); setPurchasePrice(0); setError(''); setSuccess('');
   };
   const openEdit = (part: SparePart) => {
      setEditingMode('EDIT'); setEditing({ ...part }); setPaid(false); setPurchasePrice(0); setError(''); setSuccess('');
   };
   const openRestock = (id: string) => {
      setRestockingId(id); setAdded(1); setPaid(false); setPurchasePrice(0); setError(''); setSuccess('');
   };

   const save = (event: FormEvent) => {
      event.preventDefault();
      if (!editing) return;
      try {
         if (isNew && parts.some((part) => part.id === editing.id.trim().toUpperCase())) throw new Error('Part ID already exists. Edit that part or use Add quantity.');
         saveSparePart(editing, paid ? { paid: true, actualUnitCostVnd: purchasePrice } : undefined);
         setSuccess(isNew ? 'Spare part created.' : 'Spare part updated.');
         setEditing(null); setError('');
      } catch (cause) {
         setError(cause instanceof Error ? cause.message : 'Unable to save spare part.');
      }
   };
   const restock = (event: FormEvent) => {
      event.preventDefault();
      if (!restockingId) return;
      try {
         addSparePartQuantity(restockingId, added, paid ? { paid: true, actualUnitCostVnd: purchasePrice } : undefined);
         setSuccess(`${added} unit(s) added to ${restockingId}.`);
         setRestockingId(null); setError('');
      } catch (cause) {
         setError(cause instanceof Error ? cause.message : 'Unable to add quantity.');
      }
   };

   return (
      <AdminPageShell
         title="Spare Parts"
         description=""
         actions={<>
            <Link className="button button-secondary" to="/admin/replacement/requests?type=PART">Replacement records</Link>
            <ActionButton icon="plus" onClick={openAdd}>Add spare part</ActionButton>
         </>}
      >
         {success && <p role="status" className="mb-4 text-sm text-[var(--admin-green)]">{success}</p>}
         <OperatorPanel className="flush-panel">
            <AdminToolbar
               searchValue={query} onSearchChange={setQuery}
               placeholder="Search part ID, component or drone model…"
               meta={`${visible.length} of ${parts.length} part models`}
               filters={<select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="ALL">All parts</option>
                  <option value="LOW">Low quantity</option>
                  <option value="OUT">Out of parts</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
               </select>}
            />
            <div className="table-wrap"><table>
               <thead><tr><th>Part ID</th><th>Component</th><th>Drone model</th><th>Quantity</th><th>Actions</th></tr></thead>
               <tbody>
                  {visible.map((part) => (
                     <tr key={part.id}>
                        <td><strong>{part.id}</strong></td>
                        <td><strong>{part.name}</strong><small>Reference cost: {formatVnd(getSparePartReferenceUnitCostVnd(part))} (demo/configured)</small></td>
                        <td>{part.compatibleModels}</td>
                        <td>
                           <strong
                              className={part.active && part.quantity === 0
                                 ? "text-red-500"
                                 : part.active && part.quantity <= LOW_QUANTITY
                                    ? "text-orange-500"
                                    : undefined}
                              title={part.active && part.quantity <= LOW_QUANTITY
                                 ? "Quantity low — add more spare parts"
                                 : undefined}
                           >
                              {part.quantity}
                           </strong>
                        </td>
                        <td><div className="flex flex-wrap items-center gap-2">
                           <ActionButton variant="ghost" onClick={() => openEdit(part)}>Edit</ActionButton>
                           <ActionButton
                              variant="secondary"
                              disabled={!part.active}
                              onClick={() => openRestock(part.id)}
                              style={part.active && part.quantity <= LOW_QUANTITY
                                 ? { borderColor: "#FF6B00", color: "#FF6B00", backgroundColor: "transparent" }
                                 : undefined}
                           >
                              Add quantity
                           </ActionButton>
                        </div></td>
                     </tr>
                  ))}
                  {!visible.length && <tr><td colSpan={5} className="text-center">No matching spare parts.</td></tr>}
               </tbody>
            </table></div>
         </OperatorPanel>

         <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
            {editing && <DialogContent className="max-h-[85vh] overflow-y-auto"><form onSubmit={save}>
               <div className="border-b border-border p-5">
                  <DialogTitle className="text-lg font-semibold">{isNew ? 'Add spare part' : 'Edit spare part'}</DialogTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Each record is a component model, not a physical warehouse item.</p>
               </div>
               <div className="fields two p-5">
                  <label><span>Part ID</span><input required disabled={!isNew} placeholder="PART-M350-MOTOR-02" value={editing.id} onChange={(event) => setEditing({ ...editing, id: event.target.value.toUpperCase() })} /></label>
                  <label><span>Component</span><select required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })}>
                     {CORE_SPARE_PART_CATEGORIES.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
                  </select></label>
                  <label><span>Drone model</span><select required value={editing.compatibleModels} onChange={(event) => setEditing({ ...editing, compatibleModels: event.target.value })}>
                     <option value="">Select drone model</option>
                     {editing.compatibleModels && !droneModels.includes(editing.compatibleModels) && <option value={editing.compatibleModels}>{editing.compatibleModels}</option>}
                     {droneModels.map((model) => <option value={model} key={model}>{model}</option>)}
                  </select></label>
                  <label><span>Reference unit cost (VND)</span><input type="number" min={0} step={1} value={editing.unitCostVnd} onChange={(event) => setEditing({ ...editing, unitCostVnd: Number(event.target.value) })} /></label>
                  <label><span>Status</span><select value={editing.active ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setEditing({ ...editing, active: event.target.value === 'ACTIVE' })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
                  <label><span>{isNew ? 'Initial quantity' : 'Current quantity (read only)'}</span><input type="number" min={0} step={1} disabled={!isNew} required value={editing.quantity} onChange={(event) => setEditing({ ...editing, quantity: Number(event.target.value) })} /></label>
               </div>
               {isNew && editing.quantity > 0 && <div className="mx-5 border-t border-border pt-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} /> Purchase already paid — record expense</label>
                  {paid && <label className="mt-3 block text-sm"><span>Actual unit purchase price (VND)</span><input type="number" min={1} step={1} required value={purchasePrice || ''} onChange={(event) => setPurchasePrice(Number(event.target.value))} /></label>}
               </div>}
               {!isNew && <p className="px-5 text-xs text-muted-foreground">To increase quantity, use <strong>Add quantity</strong> from the table. Confirming supply decreases quantity automatically.</p>}
               {error && <p role="alert" className="mx-5 mt-3 text-sm text-red-500">{error}</p>}
               <div className="form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={() => setEditing(null)}>Cancel</ActionButton><ActionButton type="submit">{isNew ? 'Create spare part' : 'Save changes'}</ActionButton></div>
            </form></DialogContent>}
         </Dialog>

         <Dialog open={Boolean(restockingId)} onOpenChange={(open) => !open && setRestockingId(null)}>
            {restocking && <DialogContent className="spare-quantity-dialog"><form onSubmit={restock}>
               <div className="spare-quantity-header">
                  <DialogTitle className="text-lg font-semibold">Add Quantity</DialogTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{restocking.id} · {restocking.name} · {restocking.compatibleModels}</p>
               </div>
               <div className="spare-quantity-body">
                  <div className="fields two spare-quantity-fields">
                     <label>
                        <span>Current Quantity</span>
                        <input
                           className="spare-quantity-input spare-quantity-input--readonly"
                           type="text"
                           readOnly
                           tabIndex={-1}
                           aria-label="Current quantity (read only)"
                           value={restocking.quantity}
                        />
                     </label>
                     <label>
                        <span>Quantity to Add <span className="spare-quantity-required" aria-hidden="true">*</span></span>
                        <input
                           className="spare-quantity-input"
                           type="number"
                           min={1}
                           step={1}
                           required
                           aria-label="Quantity to add"
                           value={added}
                           onChange={(event) => setAdded(Number(event.target.value))}
                        />
                     </label>
                  </div>
                  <div className="spare-quantity-result">
                     <span>Quantity after addition</span>
                     <strong>{Number.isSafeInteger(added) && added > 0 ? `${restocking.quantity + added} units` : '—'}</strong>
                  </div>
                  <div className="spare-quantity-cost">
                     <div className="spare-quantity-cost-title">
                        <span><ReceiptText size={17} aria-hidden="true" /> Acquisition Cost</span>
                        <small>Auto calculated</small>
                     </div>
                     <div className="spare-quantity-cost-row">
                        <span>Reference Unit Price</span>
                        <strong>{restockUnitPrice > 0 ? formatVnd(restockUnitPrice) : 'Not configured'}</strong>
                     </div>
                     <div className="spare-quantity-cost-row spare-quantity-cost-total">
                        <span>Reference Total Cost</span>
                        <strong>{restockValid ? formatVnd(added * restockUnitPrice) : '—'}</strong>
                     </div>
                  </div>
                  <p className="spare-quantity-hint">The reference cost is an estimate. Select “Purchase already paid” below only if an actual purchase was paid; no bank payment is performed here.</p>
                  {error && <p role="alert" className="spare-quantity-error">{error}</p>}
               </div>
               <div className="mx-5 border-t border-border pt-3 pb-3">
                  <label className="flex items-center gap-2 text-sm">
                     <input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
                     Purchase already paid — record expense
                  </label>
                  {paid && <div className="mt-3 fields two">
                     <label><span>Actual unit purchase price (VND)</span>
                        <input type="number" min={1} step={1} required value={purchasePrice || ''}
                           onChange={(event) => setPurchasePrice(Number(event.target.value))} /></label>
                     <label><span>Cash outflow (VND)</span>
                        <input readOnly value={Number.isSafeInteger(added) && added > 0 ? formatVnd(added * purchasePrice) : '—'} /></label>
                  </div>}
                  <p className="mt-2 text-xs text-muted-foreground">
                     Quantity is increased when parts are received. Only paid purchases record a cash expense; confirming replacement supply does not.
                  </p>
               </div>
               <div className="spare-quantity-footer">
                  <ActionButton variant="secondary" onClick={() => setRestockingId(null)}>Cancel</ActionButton>
                  <ActionButton type="submit" disabled={!restockValid}>Confirm Addition</ActionButton>
               </div>
            </form></DialogContent>}
         </Dialog>
      </AdminPageShell>
   );
}
