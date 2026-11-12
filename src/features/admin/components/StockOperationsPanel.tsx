import { useEffect, useState } from 'react';
import { ActionButton } from '../../../components/ui/ActionButton';
import { OperatorPanel } from '../../operator/components/OperatorPanel';
import { adminOperationsApi, apiError, type HubApi, type PartCategoryApi, type StockApi, type StockTransactionApi } from '../api/adminOperationsApi';

/** Real Backend stock movements. BE performs inventory checks and writes SupplyTransaction. */
export function StockOperationsPanel({ hubs, parts, stocks, onChanged }: {
  hubs: HubApi[]; parts: PartCategoryApi[]; stocks: StockApi[]; onChanged: () => Promise<void>;
}) {
  const [kind,setKind]=useState<'TRANSFER'|'ADJUST'|'DISCARD'|'THRESHOLD'|'BULK'>('TRANSFER');
  const [hubId,setHubId]=useState('');
  const [toHub,setToHub]=useState('');
  const [partId,setPartId]=useState('');
  const [number,setNumber]=useState('1');
  const [note,setNote]=useState('');
  const [bulkText,setBulkText]=useState('');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [logs,setLogs]=useState<StockTransactionApi[]>([]);
  const [logError,setLogError]=useState('');
  async function loadLogs(){try{setLogs(await adminOperationsApi.stockTransactions());setLogError('');}catch(e){setLogError(apiError(e));}}
  useEffect(()=>{void loadLogs();},[]);
  const hub=Number(hubId), destination=Number(toHub), part=Number(partId), qty=Number(number);
  const knownHub=hubs.some(h=>h.id===hub),knownPart=parts.some(p=>p.id===part);
  const current=stocks.find(s=>s.hub_id===hub&&s.part_category_id===part);
  const parsedBulk=bulkText.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean).map(line=>{
    const segments=line.split(',').map(s=>s.trim());
    return {part_category_id:Number(segments[0]),quantity:Number(segments[1]),...(segments[2]?{unit_cost_override:Number(segments[2])}:{})};
  });
  const validBulk=parsedBulk.length>0&&parsedBulk.every(b=>parts.some(p=>p.id===b.part_category_id)&&Number.isSafeInteger(b.quantity)&&b.quantity>0 && (b.unit_cost_override===undefined || Number.isFinite(b.unit_cost_override)&&b.unit_cost_override>=0));
  const valid=knownHub&&(kind==='BULK'?validBulk : knownPart && (kind==='THRESHOLD'?Number.isSafeInteger(qty)&&qty>=0:
    kind==='ADJUST'?Number.isSafeInteger(qty)&&qty!==0 : Number.isSafeInteger(qty)&&qty>0))
    &&(kind!=='TRANSFER'||hubs.some(h=>h.id===destination&&h.id!==hub));
  async function submit(){if(!valid||saving)return;
    if(!window.confirm(`${kind}: submit physical stock change to Backend? This operation is audit-logged.`))return;
    setSaving(true);setError('');setNotice('');
    try {
      if(kind==='TRANSFER')await adminOperationsApi.transferStock({from_hub_id:hub,to_hub_id:destination,part_category_id:part,quantity:qty,...(note.trim()?{note:note.trim()}:{})});
      else if(kind==='ADJUST')await adminOperationsApi.adjustStock(hub,{part_category_id:part,quantity_delta:qty,reason:'Adjust',...(note.trim()?{note:note.trim()}:{})});
      else if(kind==='DISCARD')await adminOperationsApi.discardStock(hub,{part_category_id:part,quantity:qty,...(note.trim()?{note:note.trim()}:{})});
      else if(kind==='THRESHOLD')await adminOperationsApi.setStockThreshold(hub,{part_category_id:part,min_stock_threshold:qty});
      else await adminOperationsApi.bulkReceive(hub,parsedBulk);
      setNotice(`${kind} recorded by Backend.`);await onChanged();await loadLogs();
    }catch(e){setError(apiError(e));}finally{setSaving(false);}
  }
  return <div className="mt-4 space-y-4">
    <OperatorPanel title="Hub stock operations" eyebrow="BACKEND INVENTORY CONTROLS">
      <div className="p-4">
        <p className="mb-3 text-xs text-muted-foreground">Import from supplier is available via Add quantity above. These additional operations update Backend immediately after confirmation.</p>
        <div className="fields two">
          <label><span>Operation</span><select value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setError('');setNumber('1');}}>
            <option value="TRANSFER">Transfer between Hubs</option><option value="ADJUST">Inventory adjustment (+ / -)</option><option value="DISCARD">Discard damaged / expired items</option><option value="THRESHOLD">Set low-stock threshold</option><option value="BULK">Bulk supplier receipt</option>
          </select></label>
          <label><span>{kind==='TRANSFER'?'Origin Hub':'Affected Hub'}</span><select value={hubId} onChange={e=>setHubId(e.target.value)}><option value="">Select Hub</option>{hubs.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
          {kind!=='BULK'&&<label><span>Part category</span><select value={partId} onChange={e=>setPartId(e.target.value)}><option value="">Select part category</option>{parts.map(p=><option key={p.id} value={p.id}>{p.name} (#{p.id})</option>)}</select></label>}
          {kind==='TRANSFER'&&<label><span>Destination Hub</span><select value={toHub} onChange={e=>setToHub(e.target.value)}><option value="">Select another Hub</option>{hubs.filter(h=>String(h.id)!==hubId).map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label>}
          {kind==='BULK'?<label><span>Items · one per line: category ID, quantity, optional unit cost</span><textarea rows={4} placeholder="1, 3, 120000\n2, 5" value={bulkText} onChange={e=>setBulkText(e.target.value)}/></label>:<label><span>{kind==='THRESHOLD'?'Minimum stock threshold':kind==='ADJUST'?'Quantity change (signed)':'Quantity'}</span><input type="number" step={1} value={number} onChange={e=>setNumber(e.target.value)}/></label>}
          <label><span>Note (optional)</span><input value={note} onChange={e=>setNote(e.target.value)}/></label>
        </div>
        {knownHub&&knownPart&&kind!=='BULK'&&<p className="mt-3 text-xs text-muted-foreground">Current Hub quantity: {current?.quantity??0}. Reported minimum threshold: {current?.min_stock_threshold??0}.</p>}
        {error&&<p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
        {notice&&<p role="status" className="mt-3 text-sm text-green-600">{notice}</p>}
        <div className="mt-4"><ActionButton disabled={saving||!valid} onClick={()=>void submit()}>{saving?'Submitting…':`Confirm ${kind.toLowerCase()}`}</ActionButton></div>
      </div>
    </OperatorPanel>
    <OperatorPanel title="Stock movement history" eyebrow="BACKEND SUPPLY TRANSACTIONS">
      {logError&&<p role="alert" className="p-3 text-xs text-red-500">{logError} <button type="button" className="text-button" onClick={()=>void loadLogs()}>Retry</button></p>}
      <div className="table-wrap"><table><thead><tr><th>When</th><th>Hub</th><th>Part</th><th>Change</th><th>Reason</th><th>Reference</th></tr></thead><tbody>
        {logs.slice(0,100).map(l=><tr key={l.id}><td>{l.created_at?new Date(l.created_at).toLocaleString('en-GB'):'—'}</td>
          <td>{hubs.find(h=>h.id===l.hub_id)?.name??l.hub_id}</td><td>{l.part_name??l.part_category_id}</td><td>{l.quantity_delta}</td><td>{l.reason}</td><td>{l.reference_id??'—'}</td></tr>)}
        {!logs.length&&<tr><td colSpan={6}>No transactions returned.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>
  </div>;
}
