/** Shared, browser-local prototype data for Admin and Technician.
 * Never changes operational API data or pretends to ship physical stock. */
import { getAdminHubs } from './adminStore';
import type { AdminAuditLog, AdminPayment, AdminRefund } from '../types';
import { adminPayments, adminRefunds } from '../data/adminData';

export type ReplacementKind = 'PART' | 'BATTERY';
export type ReplacementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
export interface ReplacementRequest {
  id: string;
  type: ReplacementKind;
  hubId: string;
  droneId?: string;
  batteryId?: string;
  partId?: string;
  quantity: number;
  reason: string;
  technician: string;
  status: ReplacementStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;
  fulfilledAt?: string;
}
export interface SparePart {
  id: string;
  name: string;
  compatibleModels: string;
  unitCostVnd: number;
  active: boolean;
  stockByHub: Record<string,number>;
}
export interface PrototypeActivity {
  id: string; at: string; actor: string; role: 'admin' | 'technician'; action: string; target: string; detail?: string;
}
const prefix = 'droneoptai.prototype.v1.';
const updated = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('admin-data-updated')); };
function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(prefix + key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function write<T>(key: string, data: T) { localStorage.setItem(prefix + key, JSON.stringify(data)); updated(); }
const catalog = [
  ['PROP','Propeller'], ['MOTOR','Motor'], ['ESC','Electronic Speed Controller (ESC)'],
  ['FC','Flight Controller'], ['GPS','GPS/GNSS Module'], ['COM','Communication Module'],
  ['PDM','Power Distribution Module'], ['PAY','Payload Release Mechanism'],
] as const;
export function getSpareParts(): SparePart[] {
  return read('parts', catalog.map(([id,name]) => ({ id:`PART-${id}`, name, compatibleModels:'Model-specific', unitCostVnd:0, active:true, stockByHub: Object.fromEntries(getAdminHubs().map((hub)=>[hub.id,4])) })));
}
export function saveSparePart(part: SparePart) {
  if (!part.name.trim()) throw new Error('Part name is required.');
  const items = getSpareParts(); const i = items.findIndex(p => p.id === part.id);
  if (i >= 0) items[i] = part; else items.unshift(part);
  write('parts',items); recordPrototypeActivity('admin','Admin',i >= 0 ? 'UPDATE_PART' : 'CREATE_PART',part.id);
}
export function getReplacementRequests(): ReplacementRequest[] { return read('requests', [] as ReplacementRequest[]); }
export function submitReplacement(input: Omit<ReplacementRequest,'id'|'createdAt'|'status'>): ReplacementRequest {
  if (!input.reason.trim() || !input.hubId || input.quantity < 1 || !Number.isInteger(input.quantity)) throw new Error('Hub, reason and valid quantity are required.');
  if (input.type === 'PART' && (!input.partId || !getSpareParts().some(p=>p.id === input.partId && p.active))) throw new Error('Choose an active spare part.');
  if (input.type === 'BATTERY' && !input.batteryId) throw new Error('Select a battery needing replacement.');
  const item: ReplacementRequest = { ...input, id:`REQ-${Date.now()}-${Math.floor(Math.random()*10000)}`, createdAt:new Date().toISOString(),status:'PENDING' };
  write('requests',[item,...getReplacementRequests()]); recordPrototypeActivity('technician',input.technician,'REQUEST_REPLACEMENT',item.id);
  return item;
}
export function reviewReplacement(id:string, decision:'APPROVED'|'REJECTED', note:string, actor='Admin') {
  const items = getReplacementRequests(); const item=items.find(r=>r.id===id);
  if (!item || item.status!=='PENDING') throw new Error('Only pending requests can be reviewed.');
  if (decision==='REJECTED' && !note.trim()) throw new Error('A rejection reason is required.');
  if (decision==='APPROVED' && item.type==='PART') {
    // Approval authorizes provisioning; stock is NOT increased until receipt.
    const part=getSpareParts().find(p=>p.id===item.partId);
    if (!part?.active) throw new Error('The selected spare part is inactive or missing.');
  }
  item.status=decision; item.adminNote=note.trim(); item.reviewedAt=new Date().toISOString(); item.reviewedBy=actor;
  write('requests',items); recordPrototypeActivity('admin',actor,decision==='APPROVED'?'APPROVE_REPLACEMENT':'REJECT_REPLACEMENT',id,note);
}
export function confirmReplacementReceipt(id:string,technician='Technician') {
  const items=getReplacementRequests(); const item=items.find(r=>r.id===id);
  if (!item || item.status!=='APPROVED') throw new Error('Only approved requests can be received.');
  item.status='FULFILLED'; item.fulfilledAt=new Date().toISOString();
  if(item.type==='PART' && item.partId) {
    const parts=getSpareParts(); const part=parts.find(p=>p.id===item.partId);
    if(part){ part.stockByHub[item.hubId]=(part.stockByHub[item.hubId]||0)+item.quantity; write('parts',parts); }
  }
  write('requests',items); recordPrototypeActivity('technician',technician,'CONFIRM_RECEIPT',id);
}
export function getPrototypeActivity(): PrototypeActivity[] { return read('activity', [] as PrototypeActivity[]); }
export function recordPrototypeActivity(role:'admin'|'technician',actor:string,action:string,target:string,detail='') {
  const a:PrototypeActivity={id:`LOG-${Date.now()}-${Math.floor(Math.random()*10000)}`,at:new Date().toISOString(),actor,role,action,target,detail};
  write('activity',[a,...getPrototypeActivity()].slice(0,500));
}
export function getPrototypeAudit(): AdminAuditLog[] { return getPrototypeActivity().map(a=>({id:a.id,actor:a.actor,role:a.role,action:a.action,entityType:a.action.includes('USER')?'User':a.action.includes('REFUND')?'Payment':a.action.includes('PART')?'Spare Part':'Replacement',entityId:a.target,result:'SUCCESS',afterValue:a.detail,occurredAt:a.at})); }
export function getPrototypePayments():AdminPayment[] {return read('payments',adminPayments);}
export function getPrototypeRefunds():AdminRefund[] {return read('refunds',adminRefunds);}
export function executePrototypeRefund(paymentId:string,reason:string) {
  const payments=getPrototypePayments(); const payment=payments.find(p=>p.id===paymentId);
  if(!payment || !payment.refundable || payment.status!=='PAID')throw new Error('Only eligible paid transactions can be refunded.');
  const now=new Date().toISOString(); payment.status='REFUNDED';payment.refundable=false;payment.refundedAt=now;
  payment.refundBlockReason='Already refunded'; write('payments',payments);
  write('refunds',[{id:`REF-${Date.now()}`,paymentId:payment.id,orderId:payment.orderId,customerName:payment.customerName,amountVnd:payment.amountVnd,reason:reason.trim()||'Full refund (prototype)',status:'COMPLETED',requestedAt:now,processedAt:now},...getPrototypeRefunds()]);
  recordPrototypeActivity('admin','Admin','ISSUE_REFUND',payment.id);
}
export function getUserActivity(userId:string) {return getPrototypeActivity().filter(a=>a.target===userId);}

export interface PrototypeExpense {id:string;date:string;category:'DRONE'|'BATTERY'|'SPARE_PART'|'OTHER';amountVnd:number;description:string;hubId?:string;}
export function getPrototypeExpenses():PrototypeExpense[] {return read('expenses',[] as PrototypeExpense[]);}
export function addPrototypeExpense(expense:Omit<PrototypeExpense,'id'|'date'>) {
  if(!expense.description.trim()||!Number.isFinite(expense.amountVnd)||expense.amountVnd<=0)throw new Error('Enter an expense description and a positive amount.');
  const item:PrototypeExpense={...expense,id:`EXP-${Date.now()}`,date:new Date().toISOString()};
  write('expenses',[item,...getPrototypeExpenses()]);recordPrototypeActivity('admin','Admin','RECORD_EXPENSE',item.id,expense.description);
}
