import { useMemo, useState } from "react";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminToolbar } from "../../components/AdminToolbar";
import { adminAuditLogs } from "../../data/adminData";

export function AuditLogsPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [result, setResult] = useState("all");
  const visible = useMemo(() => adminAuditLogs.filter((log) => `${log.actor} ${log.action} ${log.entityType} ${log.entityId}`.toLowerCase().includes(query.toLowerCase()) && (role === "all" || log.role === role) && (result === "all" || log.result === result)), [query, role, result]);

  return (
    <AdminPageShell title="Audit Logs" description="Read-only trace of significant user and system actions for accountability and troubleshooting.">
      <OperatorPanel className="flush-panel">
        <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search actor, action or entity…" filters={<>
          <select value={role} onChange={(e) => setRole(e.target.value)}><option value="all">All roles</option><option value="admin">Admin</option><option value="operator">Operator</option><option value="technician">Technician</option><option value="customer">Customer</option></select>
          <select value={result} onChange={(e) => setResult(e.target.value)}><option value="all">All results</option><option value="SUCCESS">Success</option><option value="FAILED">Failed</option></select>
        </>} meta={`${visible.length} records`} />
        <div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Entity</th><th>Result</th><th>Change</th></tr></thead><tbody>
          {visible.map((log) => <tr key={log.id}><td>{new Date(log.occurredAt).toLocaleString("en-GB")}</td><td><strong>{log.actor}</strong><small>{log.id}</small></td><td className="capitalize">{log.role}</td><td>{log.action}</td><td><strong>{log.entityId}</strong><small>{log.entityType}</small></td><td><StatusBadge tone={log.result === "SUCCESS" ? "success" : "danger"}>{log.result}</StatusBadge></td><td><small>{log.beforeValue ?? "—"}</small><strong>{log.afterValue ?? "—"}</strong></td></tr>)}
        </tbody></table></div>
      </OperatorPanel>
    </AdminPageShell>
  );
}
