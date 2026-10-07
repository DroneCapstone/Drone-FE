import { useState } from "react";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { useAuth } from "../../../auth/hooks/useAuth";

export function AdminProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "Administrator");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <AdminPageShell title="Profile" description="Administrator account information and personal settings.">
      <div className="profile-layout">
        <aside className="profile-card">
          <div className="profile-avatar">AD</div>
          <h2>{user?.name ?? "Administrator"}</h2>
          <p>{user?.email ?? "admin@droneopt.ai"}</p>
          <StatusBadge tone="success">Administrator</StatusBadge>
          <div className="profile-meta">
            <span><small>User ID</small><strong>{user?.id ?? "—"}</strong></span>
            <span><small>Role</small><strong>ADMIN</strong></span>
          </div>
        </aside>
        <div className="profile-main">
          <OperatorPanel title="Personal information">
            <div className="fields two">
              <label><span>Full name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label><span>Email address</span><input value={user?.email ?? "admin@droneopt.ai"} disabled /></label>
              <label><span>Role</span><input value="ADMIN" disabled /></label>
            </div>
            <div className="form-actions"><span className="text-sm text-[var(--green)]">{saved ? "Profile saved." : ""}</span><ActionButton onClick={save}>Save changes</ActionButton></div>
          </OperatorPanel>
          <OperatorPanel title="Security">
            <p className="text-sm text-[var(--muted)]">Password changes should reuse the existing authentication reset/change-password flow. Admin never sees another user's plain password.</p>
          </OperatorPanel>
        </div>
      </div>
    </AdminPageShell>
  );
}
