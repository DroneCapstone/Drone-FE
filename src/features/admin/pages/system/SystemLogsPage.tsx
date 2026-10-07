import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminStatusBadge } from "../../components/AdminStatusBadge";
import { adminSystemLogs } from "../../data/adminData";

export function SystemLogsPage() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const visible = useMemo(() => adminSystemLogs.filter((log) => (level === "all" || log.level === level) && `${log.service} ${log.message}`.toLowerCase().includes(query.toLowerCase())), [query, level]);
  return <AdminPageShell title="System logs" description="Backend/service events for platform health and incident diagnosis.">
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]"><div className="flex flex-wrap gap-3 border-b border-[var(--admin-border)] p-4"><div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2"><Search size={15} className="text-[var(--admin-muted)]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search service logs..." className="w-full bg-transparent text-[12px] outline-none" /></div><select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 text-[12px]"><option value="all">All levels</option><option>ERROR</option><option>WARN</option><option>INFO</option></select></div><div className="divide-y divide-[var(--admin-border)]">{visible.map((log) => <div key={log.id} className="grid gap-2 px-4 py-3 md:grid-cols-[140px_120px_180px_1fr]"><span className="text-[11px] text-[var(--admin-muted)]">{new Date(log.occurredAt).toLocaleString("en-GB")}</span><div><AdminStatusBadge tone={log.level === "ERROR" ? "danger" : log.level === "WARN" ? "warning" : "info"}>{log.level}</AdminStatusBadge></div><code className="text-[11px] text-orange-500">{log.service}</code><span className="text-[12px] text-[var(--admin-text)]">{log.message}</span></div>)}</div></div>
  </AdminPageShell>;
}
