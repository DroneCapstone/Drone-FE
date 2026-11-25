import { adminDisplayText } from '../../utils/adminDisplayText';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminPageShell } from '../../components/AdminPageShell';
import { authService } from '../../../auth/services/authService';
import { adminUsersApi, apiErrorText, isArchivedUser, type AdminApiRole, type AdminApiUser, type AdminUserActivityItem } from '../../api/adminUsersApi';
import './AdminUsers.css';

type EditDraft = { full_name: string; email: string; role: AdminApiRole };
const toDraft = (user: AdminApiUser): EditDraft => ({ full_name: user.full_name, email: user.email, role: user.role });
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB');
};
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="admin-ud-field"><dt>{label}</dt><dd>{children}</dd></div>;
}

export function AdminUserDetailPage() {
  const { userId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const editing = searchParams.get('edit') === '1';
  const [user, setUser] = useState<AdminApiUser | null>(null);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [error, setError] = useState('');
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState<AdminUserActivityItem[]>([]);

  useEffect(() => {
    let mounted = true;
    if (!userId) { setLoadError('Missing user ID.'); setLoading(false); return; }
    setLoading(true);
    setLoadError('');
    setUser(null);
    Promise.all([adminUsersApi.getUser(userId), adminUsersApi.listUsers()])
      .then(([nextUser, users]) => {
        if (!mounted) return;
        setUser(nextUser);
        setAdminCount(users.filter((item) => item.role === 'Admin' && item.is_active).length);
      }).catch((reason: unknown) => { if (mounted) setLoadError(apiErrorText(reason)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userId, reload]);

  useEffect(() => {
    setDraft(editing && user ? toDraft(user) : null);
    setError('');
  }, [editing, user]);

  // GET /admin/activity-logs?user_id=... returns actions performed BY this user.
  // Do not mistake these for changes made by Admin to this user's account.
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    adminUsersApi.listActionsByUser(userId)
      .then((events) => { if (mounted) setActivity(events); })
      .catch(() => { if (mounted) setActivity([]); });
    return () => { mounted = false; };
  }, [userId, reload]);

  const closeEdit = () => { setSearchParams({}); setDraft(null); setError(''); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !draft || submitting) return;
    const fullName = draft.full_name.trim();
    const email = draft.email.trim().toLowerCase();
    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid name and email.'); return;
    }
    if ((user.role === 'Customer' && draft.role !== 'Customer') ||
      (user.role !== 'Customer' && draft.role === 'Customer')) {
      setError('Customer accounts cannot be converted to/from internal staff.'); return;
    }
    if (user.role === 'Admin' && user.is_active && adminCount !== null && adminCount <= 1 && draft.role !== 'Admin') {
      setError('The last active Admin cannot be assigned another role.'); return;
    }
    if (user.role === 'Admin' && user.is_active && adminCount === null && draft.role !== 'Admin') {
      setError('Cannot verify the last Admin protection. Try refreshing.'); return;
    }
    if (isArchivedUser(user)) { setError('Archived accounts cannot be edited here.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const updated = await adminUsersApi.updateUser(user.id, {
        full_name: fullName, email, role: draft.role,
      });
      setUser(updated);
      closeEdit();
      setNotice('User information updated successfully.');
      setReload((n) => n + 1);
    } catch (reason) {
      setError(apiErrorText(reason));
    } finally { setSubmitting(false); }
  };

  const confirmAccountAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || submitting) return;
    const deactivating = user.is_active;
    if (deactivating && user.role === 'Admin' && (adminCount === null || adminCount <= 1)) {
      setActionError('The last active Admin cannot be deactivated.'); return;
    }
    if (deactivating && authService.getCurrentUser()?.id === user.id) {
      setActionError('You cannot deactivate your own current Admin account here.'); return;
    }
    if (!deactivating && isArchivedUser(user)) {
      setActionError('Archived accounts cannot be restored.'); return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      if (deactivating) {
        await adminUsersApi.deactivateUser(user.id); // DELETE is a Soft Delete (is_active=false).
        setUser({ ...user, is_active: false });
      } else {
        const restored = await adminUsersApi.restoreUser(user.id); // PATCH /restore.
        setUser(restored);
      }
      setConfirmStatus(false);
      setNotice(deactivating ? 'Account deactivated. The user can no longer sign in.' : 'Account restored. The user can sign in again.');
      setReload((n) => n + 1);
    } catch (reason) {
      setActionError(apiErrorText(reason));
    } finally { setSubmitting(false); }
  };

  if (!userId) return <AdminPageShell title="User detail"><Link to="/admin/users">Back to Users</Link></AdminPageShell>;
  if (loading && !user) return <AdminPageShell title="User detail"><OperatorLoadingState label="Loading account…" /></AdminPageShell>;
  if (!user) return <AdminPageShell title="User detail"><div className="admin-ud-list-error" role="alert">
    <span>{loadError || 'User not found.'}</span>
    <ActionButton variant="secondary" onClick={() => setReload((n) => n + 1)}>Retry</ActionButton>
    <Link to="/admin/users">Back to Users</Link>
  </div></AdminPageShell>;

  const archived = isArchivedUser(user);
  const lastActiveAdmin = user.role === 'Admin' && user.is_active && (adminCount === null || adminCount <= 1);
  const currentAdmin = authService.getCurrentUser()?.id === user.id;
  const statusText = archived ? 'ARCHIVED' : user.is_active ? 'ACTIVE' : 'INACTIVE';
  const canChangeStatus = !archived && !(user.is_active && (lastActiveAdmin || currentAdmin));
  const scope = user.role === 'Technician' ? 'Hub assignment unavailable here'
    : user.role === 'Customer' ? 'Customer account' : 'System-wide access';

  return <AdminPageShell
    title={user.full_name}
    description={`${user.email} · ${user.id}`}
    actions={<div className="admin-ud-heading-actions">
      <StatusBadge tone={user.is_active ? 'success' : 'neutral'}>{statusText}</StatusBadge>
      <ActionButton variant={user.is_active ? 'danger' : 'secondary'} disabled={!canChangeStatus}
        title={archived ? 'Archived account cannot be restored.' : lastActiveAdmin ? 'Last active Admin is protected.' : currentAdmin && user.is_active ? 'Cannot deactivate your own account.' : undefined}
        onClick={() => { setActionError(''); setConfirmStatus(true); }}>
        {user.is_active ? 'Deactivate' : 'Restore account'}
      </ActionButton>
    </div>}
  >
    <div className="admin-user-detail-v2">
      <Link className="admin-ud-back" to="/admin/users"><ArrowLeft size={15} strokeWidth={2} /> Back to Users</Link>
      {notice && <p className="admin-ud-notice" role="status">{notice}</p>}
      {loadError && <p className="admin-ud-error" role="alert">{loadError}</p>}
      <div className="admin-ud-cards">
        <section className="admin-ud-card admin-ud-account" aria-labelledby="admin-ud-account-title">
          <div className="admin-ud-card-head">
            <h2 id="admin-ud-account-title">Account information</h2>
            <ActionButton variant="secondary" disabled={archived} onClick={() => { setError(''); setSearchParams({ edit: '1' }); }}>
              <Pencil size={15} aria-hidden="true" /> Edit
            </ActionButton>
          </div>
          <dl className="admin-ud-grid">
            <Field label="User ID">{user.id}</Field>
            <Field label="Full name">{user.full_name}</Field>
            <Field label="Email">{user.email}</Field>
            <Field label="Role">{user.role}</Field>
          </dl>
        </section>
        <section className="admin-ud-card admin-ud-access" aria-labelledby="admin-ud-access-title">
          <div className="admin-ud-card-head"><h2 id="admin-ud-access-title">Access & assignment</h2></div>
          <dl className="admin-ud-kv">
            <Field label="Account status"><StatusBadge tone={user.is_active ? 'success' : 'neutral'}>{statusText}</StatusBadge></Field>
            <Field label="Access scope">{scope}</Field>
            <Field label="Sign-in access">{user.is_active ? 'Allowed' : 'Blocked'}</Field>
            {archived && <Field label="Restore eligibility">Not restorable</Field>}
          </dl>
          {!user.is_active && !archived && <p className="admin-ud-helper admin-ud-scope-note">Soft-deleted account. Its history is preserved and it can be restored unless the email is registered again.</p>}
        </section>
      </div>
      {activity.length > 0 && <section className="admin-ud-card admin-ud-activity" aria-labelledby="admin-ud-activity-title">
        <div className="admin-ud-card-head"><h2 id="admin-ud-activity-title">Recent actions by this user</h2><span className="admin-ud-helper">Activity Logs</span></div>
        <div className="admin-ud-events">
          {activity.map((event) => <div className="admin-ud-event" key={event.id}>
            <div><strong>{adminDisplayText(event.action.replaceAll('_', ' '))}</strong><small>{adminDisplayText(event.resource_type, 'General')}</small></div>
            <time>{formatDate(event.created_at)}</time>
          </div>)}
        </div>
      </section>}
    </div>

    <Dialog open={editing && !archived} onOpenChange={(open) => { if (!open && !submitting) closeEdit(); }}>
      <DialogContent className="admin-ud-modal">
        <div className="admin-ud-modal-head"><DialogTitle>Edit user</DialogTitle></div>
        {draft && <form onSubmit={save}>
          <div className="admin-ud-modal-body">
            <div className="fields two admin-ud-modal-fields">
              <label><span>Full name <b aria-hidden="true">*</b></span>
                <input required value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} /></label>
              <label><span>Email <b aria-hidden="true">*</b></span>
                <input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
              <label><span>Role <b aria-hidden="true">*</b></span>
                {user.role === 'Customer' ? <input readOnly value="Customer" />
                  : <select value={draft.role} disabled={lastActiveAdmin} onChange={(event) => setDraft({ ...draft, role: event.target.value as AdminApiRole })}>
                    <option value="Admin">Admin</option><option value="Operator">Operator</option><option value="Technician">Technician</option>
                  </select>}
              </label>
            </div>
            {draft.role !== user.role && <p className="admin-ud-helper">Role change: {user.role} → {draft.role}. Check pending responsibilities.</p>}
            {error && <p className="admin-ud-error" role="alert">{error}</p>}
          </div>
          <div className="admin-ud-modal-foot">
            <ActionButton variant="secondary" disabled={submitting} onClick={closeEdit}>Cancel</ActionButton>
            <ActionButton type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save changes'}</ActionButton>
          </div>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={confirmStatus} onOpenChange={(open) => { if (!submitting) { setConfirmStatus(open); setActionError(''); } }}>
      <DialogContent className="admin-ud-modal">
        <div className="admin-ud-modal-head">
          <DialogTitle>{user.is_active ? 'Deactivate account?' : 'Restore account?'}</DialogTitle>
          <p>{user.is_active
            ? 'Sign-in will be blocked. Existing records are preserved.'
            : 'Restores sign-in access unless the account is archived.'}</p>
        </div>
        <form onSubmit={confirmAccountAction}>
          <div className="admin-ud-modal-body">
            <p className="admin-ud-helper"><strong>{user.full_name}</strong> · {user.email}</p>
            {user.role === 'Technician' && <p className="admin-ud-helper">Check for active work orders and confirm operational responsibilities before deactivation.</p>}
            {actionError && <p className="admin-ud-error" role="alert">{actionError}</p>}
          </div>
          <div className="admin-ud-modal-foot">
            <ActionButton variant="secondary" disabled={submitting} onClick={() => setConfirmStatus(false)}>Cancel</ActionButton>
            <ActionButton variant={user.is_active ? 'danger' : 'primary'} disabled={submitting} type="submit">
              {submitting ? 'Processing…' : user.is_active ? 'Confirm Deactivation' : 'Confirm Restore'}
            </ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </AdminPageShell>;
}
