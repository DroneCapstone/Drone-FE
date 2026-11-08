import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getReplacementRequests } from "../../services/prototypeWorkflow";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminStatusBadge } from "../../components/AdminStatusBadge";
import { adminAlerts } from "../../data/adminData";

export function AdminNotificationsPage() {
  const [read, setRead] = useState<string[]>([]);
  const pending = getReplacementRequests().filter(r=>r.status==='PENDING');
  return <AdminPageShell title="Admin notifications" description="System-level notices requiring administrative awareness. Operational mission notifications remain in Operator/Technician workspaces." actions={<button type="button" onClick={() => setRead(adminAlerts.map((item) => item.id))} className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-[12px]"><CheckCheck size={14} />Mark all read</button>}>
    {pending.length>0&&<div className="mb-4 rounded-lg border border-orange-500/25 p-4 text-[13px]"><strong>{pending.length} replacement record(s) awaiting supply.</strong><Link className="ml-3 text-orange-500 underline" to="/admin/replacement/requests">View records</Link></div>}
    <div className="space-y-3">{adminAlerts.map((alert) => { const isRead = read.includes(alert.id); return <button type="button" key={alert.id} onClick={() => setRead((current) => current.includes(alert.id) ? current : [...current, alert.id])} className={`flex w-full gap-3 rounded-xl border p-4 text-left ${isRead ? "border-[var(--admin-border)] bg-[var(--admin-surface)] opacity-70" : "border-orange-500/20 bg-orange-500/[0.04]"}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--admin-surface-2)] text-orange-500"><Bell size={16} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-[13px]">{alert.title}</strong><AdminStatusBadge tone={alert.severity === "Critical" ? "danger" : alert.severity === "Warning" ? "warning" : "info"}>{alert.severity}</AdminStatusBadge></div><p className="mt-1 text-[11px] leading-5 text-[var(--admin-muted)]">{alert.detail}</p><p className="mt-2 text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">{alert.source} · {new Date(alert.occurredAt).toLocaleString("en-GB")}</p></div></button>; })}</div>
  </AdminPageShell>;
}
