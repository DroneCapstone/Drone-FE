import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { AdminPageShell } from '../../components/AdminPageShell';
import { adminBackend, messageOf, type LiveAuditLog } from '../../api/adminBackend';
export function ActivityLogPage() {
  const [logs,setLogs]=useState<LiveAuditLog[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
  useEffect(()=>{let cancelled=false;adminBackend.audit(1,50).then(r=>{if(!cancelled)setLogs(r.items);}).catch(e=>{if(!cancelled)setError(messageOf(e));}).finally(()=>{if(!cancelled)setLoading(false);});return ()=>{cancelled=true;};},[]);
  return <AdminPageShell title="Activity log" description="Recent Backend audit events performed by system users.">
    {error&&<p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}{loading&&<p>Loading activity from Backend…</p>}
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]"><div className="divide-y divide-[var(--admin-border)]">
      {logs.map(l=><div key={l.id} className="flex gap-3 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-orange-500"><Activity size={16}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-[12px]">{l.user_id||'System'}</strong><span className="text-[10px] text-[var(--admin-muted)]">{new Date(l.created_at).toLocaleString('en-GB')}</span></div><p className="mt-1 text-[12px] text-[var(--admin-text)]">{l.action} · {l.resource_table||'System'}</p>{Object.keys(l.details_json).length>0&&<p className="mt-1 text-[10px] text-[var(--admin-muted)] break-all">{JSON.stringify(l.details_json)}</p>}</div></div>)}
      {!logs.length&&!loading&&<p className="p-4 text-sm text-muted-foreground">No audit activity available.</p>}
    </div></div>
  </AdminPageShell>;
}
