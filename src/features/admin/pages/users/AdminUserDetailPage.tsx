import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getAdminHubs, getAdminUsers, upsertAdminUser } from "../../services/adminStore";
import type { AdminUser } from "../../types";
import { userTone } from "../../utils/adminDisplay";

export function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const source = useMemo(() => getAdminUsers().find((item) => item.id === userId), [userId]);
  const [user, setUser] = useState<AdminUser | undefined>(source ? { ...source } : undefined);
  const [saved, setSaved] = useState(false);
  const isEditing = searchParams.get("edit") === "1";

  if (!user || !source) return <Navigate to="/admin/users" replace />;

  const hubs = getAdminHubs();
  const users = getAdminUsers();
  const lastActiveAdmin =
    user.role === "admin" &&
    user.status === "ACTIVE" &&
    users.filter((item) => item.role === "admin" && item.status === "ACTIVE").length <= 1;

  const startEdit = () => setSearchParams({ edit: "1" });

  const cancelEdit = () => {
    setUser({ ...source });
    setSaved(false);
    setSearchParams({});
  };

  const save = () => {
    const normalized: AdminUser = {
      ...user,
      hubId: user.role === "technician" ? user.hubId : undefined,
      updatedAt: new Date().toISOString(),
    };
    setUser(normalized);
    upsertAdminUser(normalized);
    setSaved(true);
    setSearchParams({});
    setTimeout(() => setSaved(false), 1800);
  };

  const toggleStatus = () => {
    if (lastActiveAdmin && user.status === "ACTIVE") return;
    const next: AdminUser = {
      ...user,
      status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      updatedAt: new Date().toISOString(),
    };
    setUser(next);
    upsertAdminUser(next);
  };

  return (
    <AdminPageShell
      title={user.fullName}
      description={`${user.email} · ${user.id}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="secondary" onClick={() => navigate("/admin/users")}>Back to users</ActionButton>
          {!isEditing ? <ActionButton variant="secondary" onClick={startEdit}>Edit user</ActionButton> : null}
          <ActionButton
            variant={user.status === "ACTIVE" ? "danger" : "secondary"}
            onClick={toggleStatus}
            disabled={lastActiveAdmin && user.status === "ACTIVE"}
          >
            {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </ActionButton>
        </div>
      }
    >
      <div className="detail-grid">
        <OperatorPanel title="Account state" eyebrow="ACCESS CONTROL">
          <div className="detail-list">
            <span><small>Status</small><StatusBadge tone={userTone(user.status)}>{user.status}</StatusBadge></span>
            <span><small>Role</small><strong className="capitalize">{user.role}</strong></span>
            <span><small>Last login</small><strong>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-GB") : "Never"}</strong></span>
            <span><small>Created</small><strong>{new Date(user.createdAt).toLocaleString("en-GB")}</strong></span>
          </div>
        </OperatorPanel>

        <OperatorPanel title="Role boundary" eyebrow="FIXED ROLES">
          <p className="text-sm text-[var(--muted)]">
            Roles are fixed to Admin, Operator, Technician and Customer. Technician accounts may be assigned to one managed hub.
          </p>
        </OperatorPanel>
      </div>

      <OperatorPanel
        title="User details"
        eyebrow={isEditing ? "EDIT MODE" : "ACCOUNT INFORMATION"}
        action={!isEditing ? <button type="button" className="text-button" onClick={startEdit}>Edit</button> : undefined}
      >
        <div className="fields two">
          <label>
            <span>Full name</span>
            <input
              value={user.fullName}
              readOnly={!isEditing}
              onChange={(e) => setUser({ ...user, fullName: e.target.value })}
            />
          </label>
          <label>
            <span>Email</span>
            <input value={user.email} readOnly />
          </label>
          <label>
            <span>Role</span>
            <select
              value={user.role}
              disabled={!isEditing || lastActiveAdmin}
              onChange={(e) => {
                const role = e.target.value as AdminUser["role"];
                setUser({
                  ...user,
                  role,
                  hubId: role === "technician" ? user.hubId ?? hubs[0]?.id : undefined,
                });
              }}
            >
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="technician">Technician</option>
              <option value="customer">Customer</option>
            </select>
          </label>
          {user.role === "technician" ? (
            <label>
              <span>Managed hub</span>
              <select
                value={user.hubId ?? ""}
                disabled={!isEditing}
                onChange={(e) => setUser({ ...user, hubId: e.target.value })}
              >
                <option value="">Select hub</option>
                {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
              </select>
            </label>
          ) : null}
        </div>

        {lastActiveAdmin ? (
          <p className="mt-4 text-sm text-[var(--muted)]">The last active Admin cannot be deactivated or demoted.</p>
        ) : null}

        <div className="form-actions">
          <span className="text-sm text-[var(--green)]">{saved ? "Changes saved." : ""}</span>
          {isEditing ? (
            <div className="flex gap-2">
              <ActionButton variant="secondary" onClick={cancelEdit}>Cancel</ActionButton>
              <ActionButton onClick={save}>Save changes</ActionButton>
            </div>
          ) : null}
        </div>
      </OperatorPanel>
    </AdminPageShell>
  );
}
