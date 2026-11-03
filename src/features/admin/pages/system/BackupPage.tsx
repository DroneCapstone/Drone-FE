import { ArchiveRestore, DatabaseBackup, Download, RotateCcw } from "lucide-react";
import { useState } from "react";
import { AdminPageShell } from "../../components/AdminPageShell";
import { resetAdminDemoData } from "../../services/adminStore";

export function BackupPage() {
  const [message, setMessage] = useState("");
  const exportSnapshot = () => {
    const payload = { exportedAt: new Date().toISOString(), type: "frontend-demo-snapshot", note: "Production backup must be implemented/database infrastructure." };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `droneoptai-admin-snapshot-${Date.now()}.json`; anchor.click(); URL.revokeObjectURL(url);
    setMessage("Demo snapshot exported.");
  };
  return <AdminPageShell title="Backup" description="Frontend controls for backup administration. Production database backup/restore must be executed by authenticated Backend infrastructure, not by browser localStorage.">
    <div className="grid gap-5 lg:grid-cols-3"><div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5"><DatabaseBackup size={22} className="text-orange-500" /><h3 className="mt-4 text-[15px] font-semibold">Create snapshot</h3><p className="mt-2 text-[11px] leading-5 text-[var(--admin-muted)]">Export a demo metadata snapshot from this frontend build.</p><button type="button" onClick={exportSnapshot} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-[12px] font-semibold text-white"><Download size={14} />Export demo snapshot</button></div><div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5"><ArchiveRestore size={22} className="text-orange-500" /><h3 className="mt-4 text-[15px] font-semibold">Restore</h3><p className="mt-2 text-[11px] leading-5 text-[var(--admin-muted)]">Disabled in frontend. Production restore should require server-side authorization, backup checksum and audit logging.</p><button type="button" disabled className="mt-5 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-[12px] opacity-45">Restore from backup</button></div><div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5"><RotateCcw size={22} className="text-orange-500" /><h3 className="mt-4 text-[15px] font-semibold">Reset demo admin data</h3><p className="mt-2 text-[11px] leading-5 text-[var(--admin-muted)]">Clear only Admin demo edits stored in this browser and reload seeded Hub/Drone/User records.</p><button type="button" onClick={() => { resetAdminDemoData(); setMessage("Admin demo data reset."); }} className="mt-5 rounded-lg border border-red-500/30 px-3 py-2 text-[12px] text-red-500">Reset demo data</button></div></div>{message && <p className="mt-4 text-[12px] text-emerald-500">{message}</p>}
  </AdminPageShell>;
}
