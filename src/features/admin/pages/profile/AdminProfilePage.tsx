import { ShieldCheck } from "lucide-react";
import { AdminPageShell } from "../../components/AdminPageShell";
import { useAuth } from "../../../auth/hooks/useAuth";

export function AdminProfilePage() {
  const { user } = useAuth();
  return <AdminPageShell title="Admin profile" description="Current authenticated administrator identity.">
    <div className="max-w-[720px] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-xl bg-orange-500 text-lg font-bold text-white">AD</span><div><h2 className="text-lg font-semibold">{user?.name ?? "Administrator"}</h2><p className="mt-1 text-[12px] text-[var(--admin-muted)]">{user?.email ?? "admin@droneopt.ai"}</p><div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500"><ShieldCheck size={14} />Administrator access</div></div></div><dl className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-[var(--admin-surface-2)] p-4"><dt className="text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">User ID</dt><dd className="mt-1 text-[12px]">{user?.id ?? "—"}</dd></div><div className="rounded-lg bg-[var(--admin-surface-2)] p-4"><dt className="text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Role</dt><dd className="mt-1 text-[12px] capitalize">{user?.role ?? "admin"}</dd></div></dl></div>
  </AdminPageShell>;
}
