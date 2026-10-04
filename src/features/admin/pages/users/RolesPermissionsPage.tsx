import { Check, Minus } from "lucide-react";
import { AdminPageShell } from "../../components/AdminPageShell";

const rows = [
  ["Dashboard / system KPI", true, false, false, false],
  ["Revenue / payment analytics", true, false, false, false],
  ["Order creation / payment", false, false, false, true],
  ["Order review / mission planning", false, true, false, false],
  ["Live mission tracking", true, true, false, false],
  ["Hub master data create / edit", true, false, false, false],
  ["Global drone inventory", true, true, false, false],
  ["Hub-local drone maintenance", false, false, true, false],
  ["Battery charging / swap", false, false, true, false],
  ["User / role management", true, false, false, false],
  ["Audit / system logs", true, false, false, false],
  ["Data governance / backup", true, false, false, false],
];

export function RolesPermissionsPage() {
  return <AdminPageShell title="Roles & permissions" description="Recommended role boundary for DroneOptAI. Admin governs system configuration and visibility, while operational workflows stay with their owning roles.">
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]"><div className="overflow-x-auto admin-scrollbar"><table className="w-full min-w-[760px] text-left text-[12px]"><thead className="bg-[var(--admin-surface-2)] text-[10px] uppercase tracking-wide text-[var(--admin-muted)]"><tr><th className="px-4 py-3">Capability</th><th className="px-4 py-3 text-center">Admin</th><th className="px-4 py-3 text-center">Operator</th><th className="px-4 py-3 text-center">Technician</th><th className="px-4 py-3 text-center">Customer</th></tr></thead><tbody className="divide-y divide-[var(--admin-border)]">{rows.map(([label, ...values]) => <tr key={String(label)}><td className="px-4 py-3 font-medium">{String(label)}</td>{values.map((allowed, index) => <td key={index} className="px-4 py-3 text-center">{allowed ? <Check size={16} className="mx-auto text-emerald-500" /> : <Minus size={16} className="mx-auto text-[var(--admin-muted)]" />}</td>)}</tr>)}</tbody></table></div></div>
    <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-4 text-[12px] leading-5 text-[var(--admin-muted)]"><strong className="text-orange-500">Important:</strong> “Admin” is not a super-operator. It may correct master data and suspend resources, but should not manually force mission lifecycle, customer package handoff, drone takeoff/landing, or technician work-order completion.</div>
  </AdminPageShell>;
}
