import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Dialog, DialogTitle } from "../../../../components/ui/Dialog";
import { AdminDialogContent as DialogContent } from "../../components/AdminDialogContent";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getUserActivity, recordPrototypeActivity } from "../../services/prototypeWorkflow";
import { getAdminHubs, getAdminUsers, upsertAdminUser } from "../../services/adminStore";
import type { AdminUser } from "../../types";
import { userTone } from "../../utils/adminDisplay";
import "./AdminUsers.css";

const roleLabel = (role: AdminUser["role"]) => ({
  admin: "Admin",
  operator: "Operator",
  technician: "Technician",
  customer: "Customer",
})[role];

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB");
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="admin-ud-field"><dt>{label}</dt><dd>{children}</dd></div>;
}

export function AdminUserDetailPage() {
  const { userId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const editing = searchParams.get("edit") === "1";
  const [version, setVersion] = useState(0);
  const [draft, setDraft] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");

  // Read current prototype data after an Admin action or when navigating to another user.
  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);
    window.addEventListener("admin-data-updated", refresh);
    return () => window.removeEventListener("admin-data-updated", refresh);
  }, []);
  useEffect(() => {
    setError("");
    setNotice("");
    setConfirmStatus(false);
    setReason("");
    const current = getAdminUsers().find((item) => item.id === userId);
    setDraft(editing && current ? { ...current } : null);
  }, [userId, editing]);

  const users = useMemo(() => getAdminUsers(), [version]);
  const user = users.find((item) => item.id === userId);
  const hubs = useMemo(() => getAdminHubs(), [version]);
  const activity = useMemo(() => userId ? getUserActivity(userId).slice(0, 5) : [], [userId, version]);

  if (!user) return <Navigate to="/admin/users" replace />;

  const assignedHub = hubs.find((hub) => hub.id === user.hubId);
  const lastActiveAdmin = user.role === "admin" && user.status === "ACTIVE" &&
    users.filter((item) => item.role === "admin" && item.status === "ACTIVE").length <= 1;
  const protectedCustomer = user.role === "customer";
  const accessScope = user.role === "technician" ? (assignedHub?.name ?? "Not assigned")
    : user.role === "customer" ? "Customer account" : "System-wide access";

  const closeEdit = () => {
    setDraft(null);
    setError("");
    setSearchParams({});
  };
  const startEdit = () => {
    setDraft({ ...user });
    setError("");
    setNotice("");
    setSearchParams({ edit: "1" });
  };

  const save = () => {
    if (!draft) return;
    const current = getAdminUsers().find((item) => item.id === user.id);
    if (!current) { setError("This user no longer exists."); return; }
    const fullName = draft.fullName.trim();
    if (!fullName) { setError("Enter a full name."); return; }
    if ((current.role === "customer" && draft.role !== "customer") ||
        (current.role !== "customer" && draft.role === "customer")) {
      setError("Customer and internal staff roles cannot be converted directly."); return;
    }
    if (lastActiveAdmin && draft.role !== "admin") {
      setError("The last active Admin cannot be changed to another role."); return;
    }
    if (draft.role === "technician" &&
        !hubs.some((hub) => hub.id === draft.hubId && hub.status === "ACTIVE")) {
      setError("Select an active Hub for the Technician."); return;
    }
    const updated: AdminUser = {
      ...current, // Preserve status and activity changes that might have arrived during editing.
      fullName,
      role: draft.role,
      hubId: draft.role === "technician" ? draft.hubId : undefined,
      updatedAt: new Date().toISOString(),
    };
    upsertAdminUser(updated);
    recordPrototypeActivity("admin", "Admin", "UPDATE_USER", updated.id,
      `Role ${current.role} → ${updated.role}; Hub ${current.hubId || "—"} → ${updated.hubId || "—"}`);
    closeEdit();
    setNotice("User information saved in the Admin prototype.");
  };

  const toggleStatus = () => {
    const current = getAdminUsers().find((item) => item.id === user.id);
    if (!current) { setError("This user no longer exists."); return; }
    const activeAdminCount = getAdminUsers().filter((item) => item.role === "admin" && item.status === "ACTIVE").length;
    if (current.role === "admin" && current.status === "ACTIVE" && activeAdminCount <= 1) {
      setConfirmStatus(false);
      return;
    }
    if (!reason.trim()) return;
    const updated: AdminUser = { ...current, status: current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", updatedAt: new Date().toISOString() };
    upsertAdminUser(updated);
    recordPrototypeActivity("admin", "Admin", updated.status === "ACTIVE" ? "ACTIVATE_USER" : "DEACTIVATE_USER", updated.id, reason.trim());
    setReason("");
    setConfirmStatus(false);
    setNotice(`Account marked ${updated.status.toLowerCase()} in the Admin prototype.`);
  };

  return <AdminPageShell
    title={user.fullName}
    description={`${user.email} · ${user.id}`}
    actions={<div className="admin-ud-heading-actions">
      <StatusBadge tone={userTone(user.status)}>{user.status}</StatusBadge>
      <ActionButton variant={user.status === "ACTIVE" ? "danger" : "secondary"}
        disabled={lastActiveAdmin}
        onClick={() => { setReason(""); setError(""); setConfirmStatus(true); }}>
        {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
      </ActionButton>
    </div>}
  >
    <div className="admin-user-detail-v2">
      <Link className="admin-ud-back" to="/admin/users"><ArrowLeft size={15} strokeWidth={2} /> Back to Users</Link>
      {notice && <p className="admin-ud-notice" role="status">{notice}</p>}
      <div className="admin-ud-cards">
        <section className="admin-ud-card admin-ud-account" aria-labelledby="admin-ud-account-title">
          <div className="admin-ud-card-head">
            <h2 id="admin-ud-account-title">Account information</h2>
            <ActionButton variant="secondary" onClick={startEdit}><Pencil size={15} aria-hidden="true"/> Edit</ActionButton>
          </div>
          <dl className="admin-ud-grid">
            <Field label="User ID">{user.id}</Field>
            <Field label="Full name">{user.fullName}</Field>
            <Field label="Email">{user.email}</Field>
            <Field label="Role">{roleLabel(user.role)}</Field>
          </dl>
        </section>
        <section className="admin-ud-card admin-ud-access" aria-labelledby="admin-ud-access-title">
          <div className="admin-ud-card-head"><h2 id="admin-ud-access-title">Access & assignment</h2></div>
          <dl className="admin-ud-kv">
            <Field label="Account status"><StatusBadge tone={userTone(user.status)}>{user.status}</StatusBadge></Field>
            <Field label="Access scope">{accessScope}</Field>
            {user.role === "technician" && <Field label="Assigned Hub">{assignedHub
              ? <Link className="admin-ud-link" to={`/admin/network/hubs/${assignedHub.id}`}>{assignedHub.name}</Link>
              : "Not assigned"}</Field>}
            <Field label="Last login">{formatDate(user.lastLoginAt)}</Field>
            <Field label="Created on">{formatDate(user.createdAt)}</Field>
          </dl>
        </section>
      </div>

      {activity.length > 0 && <section className="admin-ud-card admin-ud-activity" aria-labelledby="admin-ud-activity-title">
        <div className="admin-ud-card-head"><h2 id="admin-ud-activity-title">Recent account activity</h2><span className="admin-ud-helper">Admin prototype records</span></div>
        <div className="admin-ud-events">
          {activity.map((item) => <div className="admin-ud-event" key={item.id}>
            <div><strong>{item.action.replaceAll("_", " ")}</strong><small>{item.detail || item.actor}</small></div>
            <time>{formatDate(item.at)}</time>
          </div>)}
        </div>
      </section>}
    </div>

    <Dialog open={editing} onOpenChange={(open) => { if (!open) closeEdit(); else if (!draft) setDraft({ ...user }); }}>
      <DialogContent className="admin-ud-modal">
        <div className="admin-ud-modal-head">
          <DialogTitle>Edit user</DialogTitle>
          <p>Update account information and internal role assignment.</p>
        </div>
        {draft && <form onSubmit={(event) => { event.preventDefault(); save(); }}>
          <div className="admin-ud-modal-body">
            <div className="fields two admin-ud-modal-fields">
              <label><span>Full name <b aria-hidden="true">*</b></span>
                <input required value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} /></label>
              <label><span>Email</span><input readOnly value={draft.email} /></label>
              <label><span>Role</span>
                {protectedCustomer
                  ? <input readOnly value="Customer" />
                  : <select value={draft.role} disabled={lastActiveAdmin} onChange={(event) => {
                    const role = event.target.value as AdminUser["role"];
                    setDraft({ ...draft, role, hubId: role === "technician" ? (draft.hubId ?? "") : undefined });
                  }}>
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="technician">Technician</option>
                  </select>}
              </label>
              {draft.role === "technician" && <label><span>Assigned Hub <b aria-hidden="true">*</b></span>
                <select required value={draft.hubId ?? ""} onChange={(event) => setDraft({ ...draft, hubId: event.target.value })}>
                  <option value="">Select Hub</option>
                  {hubs.filter((hub) => hub.status === "ACTIVE").map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
                </select></label>}
            </div>
            {draft.role !== user.role && <p className="admin-ud-helper">Role change: {roleLabel(user.role)} → {roleLabel(draft.role)}. Save changes to confirm.</p>}
            {error && <p className="admin-ud-error" role="alert">{error}</p>}
          </div>
          <div className="admin-ud-modal-foot">
            <ActionButton variant="secondary" onClick={closeEdit}>Cancel</ActionButton>
            <ActionButton type="submit">Save changes</ActionButton>
          </div>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={confirmStatus} onOpenChange={(open) => { setConfirmStatus(open); if (!open) setReason(""); }}>
      <DialogContent className="admin-ud-modal">
        <div className="admin-ud-modal-head">
          <DialogTitle>{user.status === "ACTIVE" ? "Deactivate" : "Activate"} {user.fullName}?</DialogTitle>
          <p>This updates the Admin prototype account status. Production sign-in access is not connected.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); toggleStatus(); }}>
          <div className="admin-ud-modal-body">
            <label className="admin-ud-reason"><span>Reason <b aria-hidden="true">*</b></span>
              <textarea required rows={3} placeholder="Enter a reason for this change..." value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            {user.role === "technician" && <p className="admin-ud-helper">This prototype does not check or reassign active Technician work orders.</p>}
          </div>
          <div className="admin-ud-modal-foot">
            <ActionButton variant="secondary" onClick={() => setConfirmStatus(false)}>Cancel</ActionButton>
            <ActionButton variant={user.status === "ACTIVE" ? "danger" : "primary"} disabled={!reason.trim()} type="submit">
              Confirm {user.status === "ACTIVE" ? "deactivation" : "activation"}
            </ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </AdminPageShell>;
}
