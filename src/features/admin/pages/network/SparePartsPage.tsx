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