import { useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Dialog, DialogTitle } from "../../../../components/ui/Dialog";
import { AdminDialogContent as DialogContent } from "../../components/AdminDialogContent";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getUserActivity, recordPrototypeActivity } from "../../services/prototypeWorkflow";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const source = useMemo(() => getAdminUsers().find((item) => item.id === userId), [userId]);
  const [user, setUser] = useState<AdminUser | undefined>(source ? { ...source } : undefined);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [reason, setReason] = useState("");
  const [, setActivityVersion] = useState(0);
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
    if (!user.fullName.trim()) { setError('Full name is required.'); return; }
    if (user.role === 'technician' && !hubs.some(h => h.id === user.hubId && h.status === 'ACTIVE')) { setError('Select an active hub.'); return; }
    if (source.role === 'admin' && user.role !== 'admin' && source.status === 'ACTIVE' && users.filter(u=>u.role==='admin' && u.status==='ACTIVE').length <= 1) { setError('Cannot demote the last active Admin.'); return; }
    if (source.role !== user.role && !window.confirm(`Change role from ${source.role} to ${user.role}?`)) return;
    const normalized: AdminUser = {
      ...user,
      hubId: user.role === "technician" ? user.hubId : undefined,
      updatedAt: new Date().toISOString(),
    };
    setUser(normalized);
    upsertAdminUser(normalized);
    recordPrototypeActivity('admin','Admin','UPDATE_USER',normalized.id,`Role ${source.role} → ${normalized.role}; Hub ${source.hubId||'—'} → ${normalized.hubId||'—'}`);
    setActivityVersion(v=>v+1);setError('');
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
    recordPrototypeActivity('admin','Admin', next.status==='ACTIVE'?'ACTIVATE_USER':'DEACTIVATE_USER',next.id,reason||'Status changed');
    setActivityVersion(v=>v+1);setConfirmStatus(false);setReason('');
  };
  const recordAccessAction = (action:'INVITE_USER'|'RESET_ACCESS') => {
    const now=new Date().toISOString();
    const next={...user,...(action==='INVITE_USER'?{invitationSentAt:now}:{accessResetAt:now}),updatedAt:now};
    upsertAdminUser(next);setUser(next);recordPrototypeActivity('admin','Admin',action,user.id,'Prototype only — no real email/password change');setActivityVersion(v=>v+1);
  };

  return (
    <AdminPageShell
      title={user.fullName}
      backTo={{ path: "/admin/users", label: "Users" }}
      description={`${user.email} · ${user.id}`}
      actions={(
        <div className="flex flex-wrap gap-2">
          {!isEditing ? <ActionButton variant="secondary" onClick={startEdit}>Edit user</ActionButton> : null}
          <ActionButton
            variant={user.status === "ACTIVE" ? "danger" : "secondary"}
            onClick={() => setConfirmStatus(true)}
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

                {/* {lastActiveAdmin ? <p className="admin-inline-note">The last active Admin cannot be deactivated or demoted.</p> : null} */}

                {error && <p className="mb-3 text-sm text-red-500" role="alert">{error}</p>}
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

          <OperatorPanel title="Account actions" eyebrow="PROTOTYPE ACCESS">
            <p className="mb-3 text-xs text-[var(--muted)]">Simulated access actions; no real invitation email or password reset is sent.</p>
            <div className="flex flex-wrap gap-2"><ActionButton variant="secondary" onClick={()=>recordAccessAction('INVITE_USER')}>Record invitation</ActionButton><ActionButton variant="secondary" onClick={()=>recordAccessAction('RESET_ACCESS')}>Reset access (demo)</ActionButton></div>
            {user.invitationSentAt && <p className="mt-2 text-xs text-[var(--muted)]">Invitation recorded: {formatDate(user.invitationSentAt)}</p>}
          </OperatorPanel>
          <OperatorPanel title="Account activity" eyebrow="AUDIT METADATA">
            <dl className="key-values admin-user-activity">
              <div><dt>Last login</dt><dd>{formatDate(user.lastLoginAt)}</dd></div>
              <div><dt>Created</dt><dd>{formatDate(user.createdAt)}</dd></div>
              <div><dt>Last updated</dt><dd>{formatDate(user.updatedAt)}</dd></div>
              {getUserActivity(user.id).slice(0,8).map(a=><div key={a.id}><dt>{a.action} · {formatDate(a.at)}</dt><dd>{a.detail||a.actor}</dd></div>)}
            </dl>
          </OperatorPanel>

          {/* {lastActiveAdmin ? (
            <OperatorPanel title="Protection" eyebrow="ADMIN SAFETY">
              <p className="text-sm text-[var(--muted)]">This is the last active Admin account. It cannot be deactivated or changed to another role.</p>
            </OperatorPanel>
          ) : null} */}
        </aside>
      </div>
      <Dialog open={confirmStatus} onOpenChange={setConfirmStatus}><DialogContent><div className="p-5">
        <DialogTitle className="text-lg font-semibold">{user.status==='ACTIVE'?'Deactivate':'Activate'} {user.fullName}?</DialogTitle>
        <p className="mt-2 text-sm text-muted-foreground">This changes access status in the Admin prototype only. Production authentication is not connected.</p>
        <label className="mt-4 block text-sm">Reason<textarea className="mt-2 w-full rounded border border-[var(--border)] bg-transparent p-2" rows={2} value={reason} onChange={e=>setReason(e.target.value)}/></label>
        <div className="form-actions mt-4"><ActionButton variant="secondary" onClick={()=>setConfirmStatus(false)}>Cancel</ActionButton><ActionButton onClick={toggleStatus} disabled={!reason.trim()}>Confirm</ActionButton></div>
      </div></DialogContent></Dialog>
    </AdminPageShell>
  );
}
