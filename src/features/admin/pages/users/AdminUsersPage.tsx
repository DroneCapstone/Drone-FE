import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Dialog, DialogContent, DialogTitle } from "../../../../components/ui/Dialog";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { MetricCard } from "../../../operator/components/MetricCard";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminToolbar } from "../../components/AdminToolbar";
import { getAdminHubs, getAdminUsers, upsertAdminUser } from "../../services/adminStore";
import type { AdminUser } from "../../types";
import { userTone } from "../../utils/adminDisplay";

function newInternalUser(): AdminUser {
  const now = new Date().toISOString();
  return {
    id: "",
    fullName: "",
    email: "",
    role: "operator",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

function roleLabel(role: AdminUser["role"]) {
  switch (role) {
    case "admin": return "Admin";
    case "operator": return "Operator";
    case "technician": return "Technician";
    case "customer": return "Customer";
  }
}

export function AdminUsersPage() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState<AdminUser | null>(null);

  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    window.addEventListener("admin-data-updated", listener);
    return () => window.removeEventListener("admin-data-updated", listener);
  }, []);

  const users = useMemo(() => getAdminUsers(), [version]);
  const hubs = getAdminHubs();
  const visible = users.filter((user) =>
    `${user.fullName} ${user.email} ${user.id}`.toLowerCase().includes(query.toLowerCase()) &&
    (role === "all" || user.role === role) &&
    (status === "all" || user.status === status),
  );
  const hubName = (id?: string) => hubs.find((hub) => hub.id === id)?.name ?? "Not assigned";

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!creating) return;
    const now = new Date().toISOString();
    upsertAdminUser({
      ...creating,
      id: creating.id || `${creating.role}-${Date.now()}`,
      hubId: creating.role === "technician" ? creating.hubId : undefined,
      createdAt: now,
      updatedAt: now,
    });
    setCreating(null);
  };

  const internalCount = users.filter((user) => user.role !== "customer").length;
  const customerCount = users.filter((user) => user.role === "customer").length;
  const inactiveCount = users.filter((user) => user.status === "INACTIVE").length;

  return (
    <AdminPageShell
      title="Users"
      description="Manage user access, role assignment and technician hub ownership."
      actions={<ActionButton icon="plus" onClick={() => setCreating(newInternalUser())}>Create internal user</ActionButton>}
    >
      <div className="metric-grid">
        <MetricCard label="Total users" value={String(users.length)} delta="Accounts" tone="info" note="All system users" />
        <MetricCard label="Internal staff" value={String(internalCount)} delta="Staff" tone="info" note="Admins, operators and technicians" />
        <MetricCard label="Customers" value={String(customerCount)} delta="Customer" tone="success" note="Registered delivery customers" />
        <MetricCard label="Inactive" value={String(inactiveCount)} delta="Blocked" tone="warning" note="Cannot sign in" />
      </div>

      <OperatorPanel className="flush-panel">
        <AdminToolbar
          searchValue={query}
          onSearchChange={setQuery}
          placeholder="Search name, email or user ID…"
          filters={(
            <>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="technician">Technician</option>
                <option value="customer">Customer</option>
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </>
          )}
          meta={`${visible.length} of ${users.length} users`}
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role & scope</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.fullName}</strong>
                    <small>{user.email}</small>
                  </td>
                  <td>
                    <strong className="admin-user-role-label">{roleLabel(user.role)}</strong>
                    <small>{user.role === "technician" ? hubName(user.hubId) : user.role === "customer" ? "Customer account" : "System-wide access"}</small>
                  </td>
                  <td><StatusBadge tone={userTone(user.status)}>{user.status}</StatusBadge></td>
                  <td>
                    <strong>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("en-GB") : "Never"}</strong>
                    {user.lastLoginAt ? <small>{new Date(user.lastLoginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small> : null}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link className="row-action" to={`/admin/users/${user.id}`}>View</Link>
                      <Link className="row-action" to={`/admin/users/${user.id}?edit=1`}>Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OperatorPanel>

      <Dialog open={Boolean(creating)} onOpenChange={(open) => !open && setCreating(null)}>
        {creating ? (
          <DialogContent>
            <form onSubmit={save}>
              <div className="border-b border-border p-5">
                <DialogTitle className="text-lg font-semibold">Create internal user</DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">Customer accounts continue to use customer registration.</p>
              </div>
              <div className="fields two p-5">
                <label><span>Full name</span><input required value={creating.fullName} onChange={(e) => setCreating({ ...creating, fullName: e.target.value })} /></label>
                <label><span>Email</span><input required type="email" value={creating.email} onChange={(e) => setCreating({ ...creating, email: e.target.value })} /></label>
                <label>
                  <span>Role</span>
                  <select
                    value={creating.role}
                    onChange={(e) => setCreating({
                      ...creating,
                      role: e.target.value as AdminUser["role"],
                      hubId: e.target.value === "technician" ? creating.hubId ?? hubs[0]?.id : undefined,
                    })}
                  >
                    <option value="operator">Operator</option>
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                {creating.role === "technician" ? (
                  <label>
                    <span>Assigned hub</span>
                    <select required value={creating.hubId ?? ""} onChange={(e) => setCreating({ ...creating, hubId: e.target.value })}>
                      <option value="">Select hub</option>
                      {hubs.map((hub) => <option value={hub.id} key={hub.id}>{hub.name}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>
              <div className="form-actions border-t border-border p-5">
                <ActionButton variant="secondary" onClick={() => setCreating(null)}>Cancel</ActionButton>
                <ActionButton type="submit">Create account</ActionButton>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminPageShell>
  );
}
