import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Users, UserCog, UserRound, UserX, Eye, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminSummaryCard } from '../../components/AdminSummaryCard';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminUsersApi, apiErrorText, isArchivedUser, type AdminApiRole, type AdminApiUser } from '../../api/adminUsersApi';
import './AdminUsers.css';

type InternalRole = Exclude<AdminApiRole, 'Customer'>;
type CreateDraft = { full_name: string; email: string; role: InternalRole; password: string };
const emptyDraft = (): CreateDraft => ({ full_name: '', email: '', role: 'Operator', password: '' });
const userTone = (user: AdminApiUser) => user.is_active ? 'success' : 'neutral';

export function AdminUsersPage() {
  const [allUsers, setAllUsers] = useState<AdminApiUser[]>([]);
  const [statusUsers, setStatusUsers] = useState<AdminApiUser[]>([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState<CreateDraft | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Always load the full list for accurate KPI cards, plus a server-filtered list
  // when the user selects Active/Inactive (GET ?is_active=true|false).
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setListError('');
    const active = status === 'all' ? undefined : status === 'ACTIVE';
    Promise.all([
      adminUsersApi.listUsers(),
      active === undefined ? Promise.resolve(null) : adminUsersApi.listUsers(active),
    ]).then(([all, filtered]) => {
      if (!mounted) return;
      setAllUsers(all);
      setStatusUsers(filtered ?? all);
    }).catch((error: unknown) => {
      if (mounted) setListError(apiErrorText(error));
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [status, reload]);

  const visible = useMemo(() => statusUsers.filter((user) =>
    `${user.full_name} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (role === 'all' || user.role.toLowerCase() === role),
  ), [statusUsers, query, role]);

  const internalCount = allUsers.filter((user) => user.role !== 'Customer').length;
  const customerCount = allUsers.filter((user) => user.role === 'Customer').length;
  const inactiveCount = allUsers.filter((user) => !user.is_active).length;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!creating || submitting) return;
    const fullName = creating.full_name.trim();
    const email = creating.email.trim().toLowerCase();
    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Enter a valid full name and email address.'); return;
    }
    if (!creating.password) { setFormError('Enter an initial password.'); return; }
    if (allUsers.some((user) => user.is_active && user.email.toLowerCase() === email)) {
      setFormError('An active user with this email already exists.'); return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const created = await adminUsersApi.createUser({
        full_name: fullName, email, role: creating.role, password: creating.password,
      });
      setCreating(null); // Clear password from UI memory.
      setNotice(`Account ${created.email} was created successfully.`);
      setReload((count) => count + 1);
    } catch (error) {
      setFormError(apiErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return <AdminPageShell
    title="Users"
    description="Manage accounts, internal roles and access status."
    actions={<ActionButton icon="plus" onClick={() => { setFormError(''); setCreating(emptyDraft()); }}>Create internal user</ActionButton>}
  >
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard label="Total users" value={loading || listError ? '—' : allUsers.length} note="All system users" icon={Users} />
      <AdminSummaryCard label="Internal staff" value={loading || listError ? '—' : internalCount} note="Admins, operators and technicians" icon={UserCog} />
      <AdminSummaryCard label="Customers" value={loading || listError ? '—' : customerCount} note="Registered delivery customers" icon={UserRound} />
      <AdminSummaryCard label="Inactive" value={loading || listError ? '—' : inactiveCount} note="Cannot sign in" icon={UserX} />
    </div>
    {notice && <p className="admin-ud-notice" role="status">{notice}</p>}
    <OperatorPanel className="flush-panel">
      <AdminToolbar
        searchValue={query}
        onSearchChange={setQuery}
        placeholder="Search name or email…"
        filters={<>
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="technician">Technician</option>
            <option value="customer">Customer</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </>}
        meta={loading ? 'Loading users…' : `${visible.length} of ${statusUsers.length} users`}
      />
      {listError && <div className="admin-ud-list-error" role="alert">
        <span>{listError}</span>
        <ActionButton variant="secondary" onClick={() => setReload((n) => n + 1)}>Retry</ActionButton>
      </div>}
      <div className="table-wrap">
        <table className="admin-users-list-table">
          <thead><tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col" className="admin-users-actions-heading">Actions</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5}><OperatorLoadingState label="Loading users…" /></td></tr>}
            {!loading && !listError && visible.length === 0 && <tr><td colSpan={5} className="admin-users-empty">No users match the current search or filters.</td></tr>}
            {!loading && !listError && visible.map((user) => <tr key={user.id}>
              <td><strong className="admin-users-name">{user.full_name}</strong></td>
              <td><span className="admin-users-email" title={user.email}>{user.email}</span></td>
              <td><strong className="admin-user-role-label">{user.role}</strong></td>
              <td><StatusBadge tone={userTone(user)}>{isArchivedUser(user) ? 'ARCHIVED' : user.is_active ? 'ACTIVE' : 'INACTIVE'}</StatusBadge></td>
              <td><div className="admin-users-icon-actions">
                <Link
                  className="admin-users-icon-action"
                  to={`/admin/users/${encodeURIComponent(user.id)}`}
                  title={`View ${user.full_name}`}
                  aria-label={`View details for ${user.full_name}`}
                ><Eye size={17} strokeWidth={1.9} aria-hidden="true" /></Link>
                <Link
                  className="admin-users-icon-action admin-users-icon-action--edit"
                  to={`/admin/users/${encodeURIComponent(user.id)}?edit=1`}
                  title={`Edit ${user.full_name}`}
                  aria-label={`Edit ${user.full_name}`}
                ><Pencil size={16} strokeWidth={1.9} aria-hidden="true" /></Link>
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </OperatorPanel>
    <Dialog open={Boolean(creating)} onOpenChange={(open) => { if (!open && !submitting) { setCreating(null); setFormError(''); } }}>
      {creating && <DialogContent className="admin-ud-modal">
        <form onSubmit={save}>
          <div className="admin-ud-modal-head">
            <DialogTitle>Create internal user</DialogTitle>
            <p>Create a staff account. Customers register their own accounts.</p>
          </div>
          <div className="admin-ud-modal-body">
            <div className="fields two admin-ud-modal-fields">
              <label><span>Full name <b aria-hidden="true">*</b></span>
                <input required autoComplete="name" value={creating.full_name} onChange={(event) => setCreating({ ...creating, full_name: event.target.value })}/></label>
              <label><span>Email <b aria-hidden="true">*</b></span>
                <input required type="email" autoComplete="off" value={creating.email} onChange={(event) => setCreating({ ...creating, email: event.target.value })}/></label>
              <label><span>Role <b aria-hidden="true">*</b></span>
                <select value={creating.role} onChange={(event) => setCreating({ ...creating, role: event.target.value as InternalRole })}>
                  <option value="Operator">Operator</option><option value="Technician">Technician</option><option value="Admin">Admin</option>
                </select></label>
              <label><span>Initial password <b aria-hidden="true">*</b></span>
                <input required type="password" autoComplete="new-password" value={creating.password} onChange={(event) => setCreating({ ...creating, password: event.target.value })}/></label>
            </div>
            {creating.role === 'Technician' && <p className="admin-ud-helper">Creating a technician account does not assign a Hub.</p>}
            <p className="admin-ud-helper">Share the initial password securely. An invitation email is not sent automatically.</p>
            {formError && <p className="admin-ud-error" role="alert">{formError}</p>}
          </div>
          <div className="admin-ud-modal-foot">
            <ActionButton variant="secondary" disabled={submitting} onClick={() => setCreating(null)}>Cancel</ActionButton>
            <ActionButton type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create account'}</ActionButton>
          </div>
        </form>
      </DialogContent>}
    </Dialog>
  </AdminPageShell>;
}
