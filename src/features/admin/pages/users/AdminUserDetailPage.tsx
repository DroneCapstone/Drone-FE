import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getAdminHubs, getAdminUsers, upsertAdminUser } from "../../services/adminStore";
import type { AdminUser } from "../../types";
import { userTone } from "../../utils/adminDisplay";

function roleLabel(role: AdminUser["role"]) {
  switch (role) {
    case "admin": return "Admin";
    case "operator": return "Operator";
    case "technician": return "Technician";
    case "customer": return "Customer";
  }
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString("en-GB") : "Never";
}

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
  const managedHub = user.role === "technician" ? hubs.find((hub) => hub.id === user.hubId) : undefined;
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
      actions={(
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
      )}
    >
      <div className="detail-layout admin-user-detail-layout">
        <div className="detail-main">
          <OperatorPanel>
            <div className="admin-user-hero">
              <div className="admin-user-avatar" aria-hidden="true">
                {user.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U"}
              </div>
              <div className="admin-user-hero-copy">
                <div className="admin-user-hero-badges">
                  <StatusBadge tone={userTone(user.status)}>{user.status}</StatusBadge>
                  <span className="admin-role-chip">{roleLabel(user.role)}</span>
                </div>
                <h2>{user.fullName}</h2>
                <p>{user.email}</p>
                {user.role === "technician" ? <small>{managedHub ? `Managed hub · ${managedHub.name}` : "No managed hub assigned"}</small> : null}
              </div>
            </div>
          </OperatorPanel>

          <OperatorPanel
            title={isEditing ? "Edit account" : "Account information"}
            eyebrow={isEditing ? "EDIT MODE" : "PROFILE"}
          >
            {isEditing ? (
              <>
                <div className="fields two">
                  <label>
                    <span>Full name</span>
                    <input value={user.fullName} onChange={(e) => setUser({ ...user, fullName: e.target.value })} />
                  </label>
                  <label>
                    <span>Email</span>
                    <input value={user.email} readOnly />
                    <small className="admin-field-help">Login email is managed as an account identifier.</small>
                  </label>
                  <label>
                    <span>Role</span>
                    <select
                      value={user.role}
                      disabled={lastActiveAdmin}
                      onChange={(e) => {
                        const nextRole = e.target.value as AdminUser["role"];
                        setUser({
                          ...user,
                          role: nextRole,
                          hubId: nextRole === "technician" ? user.hubId ?? hubs[0]?.id : undefined,
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
                      <select value={user.hubId ?? ""} onChange={(e) => setUser({ ...user, hubId: e.target.value })}>
                        <option value="">Select hub</option>
                        {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
                      </select>
                    </label>
                  ) : null}
                </div>

                {lastActiveAdmin ? <p className="admin-inline-note">The last active Admin cannot be deactivated or demoted.</p> : null}

                <div className="form-actions admin-user-form-actions">
                  <span className="text-sm text-[var(--green)]">{saved ? "Changes saved." : ""}</span>
                  <div className="flex gap-2">
                    <ActionButton variant="secondary" onClick={cancelEdit}>Cancel</ActionButton>
                    <ActionButton onClick={save}>Save changes</ActionButton>
                  </div>
                </div>
              </>
            ) : (
              <dl className="key-values admin-user-key-values">
                <div><dt>User ID</dt><dd>{user.id}</dd></div>
                <div><dt>Full name</dt><dd>{user.fullName}</dd></div>
                <div><dt>Email</dt><dd>{user.email}</dd></div>
                <div><dt>Role</dt><dd>{roleLabel(user.role)}</dd></div>
                {user.role === "technician" ? <div><dt>Managed hub</dt><dd>{managedHub?.name ?? "Not assigned"}</dd></div> : null}
              </dl>
            )}
          </OperatorPanel>
        </div>

        <aside className="detail-side">
          <OperatorPanel title="Access" eyebrow="ACCOUNT STATE">
            <dl className="key-values">
              <div><dt>Status</dt><dd><StatusBadge tone={userTone(user.status)}>{user.status}</StatusBadge></dd></div>
              <div><dt>Sign-in access</dt><dd>{user.status === "ACTIVE" ? "Allowed" : "Blocked"}</dd></div>
              <div><dt>Role</dt><dd>{roleLabel(user.role)}</dd></div>
              {user.role === "technician" ? <div><dt>Hub scope</dt><dd>{managedHub?.name ?? "Not assigned"}</dd></div> : null}
            </dl>
          </OperatorPanel>

          <OperatorPanel title="Account activity" eyebrow="AUDIT METADATA">
            <dl className="key-values admin-user-activity">
              <div><dt>Last login</dt><dd>{formatDate(user.lastLoginAt)}</dd></div>
              <div><dt>Created</dt><dd>{formatDate(user.createdAt)}</dd></div>
              <div><dt>Last updated</dt><dd>{formatDate(user.updatedAt)}</dd></div>
            </dl>
          </OperatorPanel>

          {lastActiveAdmin ? (
            <OperatorPanel title="Protection" eyebrow="ADMIN SAFETY">
              <p className="text-sm text-[var(--muted)]">This is the last active Admin account. It cannot be deactivated or changed to another role.</p>
            </OperatorPanel>
          ) : null}
        </aside>
      </div>
    </AdminPageShell>
  );
}
