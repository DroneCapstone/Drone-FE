import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getAdminHubs, getAdminUsers, upsertAdminUser } from "../../services/adminStore";
import type { AdminUser } from "../../types";

export function AdminUserDetailPage() {
  const { userId } = useParams();
  const source = getAdminUsers().find((item) => item.id === userId);
  const [user, setUser] = useState<AdminUser | null>(source ? { ...source } : null);
  const [saved, setSaved] = useState(false);
  if (!user) return <Navigate to="/admin/users" replace />;
  const hubs = getAdminHubs();
  const save = (event: FormEvent) => { event.preventDefault(); upsertAdminUser({ ...user, hubId: user.role === "technician" ? user.hubId : undefined }); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  return <AdminPageShell title="User detail" description={`${user.id} · ${user.email}`} actions={<Link to="/admin/users" className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-[12px]"><ArrowLeft size={14} />User list</Link>}>
    <form onSubmit={save} className="max-w-[760px] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]"><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-[11px] text-[var(--admin-muted)]">Full name</span><input value={user.fullName} onChange={(e) => setUser({ ...user, fullName: e.target.value })} className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2.5 text-[12px]" /></label><label><span className="mb-1.5 block text-[11px] text-[var(--admin-muted)]">Email</span><input value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2.5 text-[12px]" /></label><label><span className="mb-1.5 block text-[11px] text-[var(--admin-muted)]">Status</span><select value={user.status} onChange={(e) => setUser({ ...user, status: e.target.value as AdminUser["status"] })} className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2.5 text-[12px]"><option>Active</option><option>Suspended</option><option>Pending</option></select></label><label><span className="mb-1.5 block text-[11px] text-[var(--admin-muted)]">Role</span><select value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value as AdminUser["role"] })} className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2.5 text-[12px]"><option value="admin">Admin</option><option value="operator">Operator</option><option value="technician">Technician</option><option value="customer">Customer</option></select></label>{user.role === "technician" && <label><span className="mb-1.5 block text-[11px] text-[var(--admin-muted)]">Managed hub</span><select value={user.hubId ?? ""} onChange={(e) => setUser({ ...user, hubId: e.target.value || undefined })} className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2.5 text-[12px]"><option value="">Unassigned</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></label>}</div><div className="flex items-center justify-between border-t border-[var(--admin-border)] px-5 py-4"><span className="text-[11px] text-emerald-500">{saved ? "Changes saved locally." : ""}</span><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-[12px] font-semibold text-white"><Save size={14} />Save changes</button></div></form>
  </AdminPageShell>;
}
