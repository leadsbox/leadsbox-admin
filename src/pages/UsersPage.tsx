import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AdminUserRow, AdminUsersPayload } from '../types/admin';

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const UsersPage = () => {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [suspended, setSuspended] = useState<'all' | 'active' | 'suspended'>('all');
  const [verified, setVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  const [loading, setLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string>('');
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/users', {
        params: {
          search: search || undefined,
          suspended:
            suspended === 'all' ? undefined : suspended === 'suspended',
          emailVerified:
            verified === 'all' ? undefined : verified === 'verified',
          limit: '200',
          offset: '0',
        },
      });
      const payload = response?.data?.data as AdminUsersPayload | undefined;
      setRows(payload?.users || []);
      setTotal(payload?.total || 0);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || 'Failed to load users.');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSuspension = async (row: AdminUserRow) => {
    try {
      setUpdatingUserId(row.id);
      const willSuspend = !row.isSuspended;
      const reason = willSuspend
        ? window.prompt('Suspension reason (optional):', 'Admin action') || ''
        : '';

      await api.patch(`/admin/users/${row.id}/status`, {
        suspended: willSuspend,
        reason: reason.trim() || undefined,
      });

      await loadUsers();
    } catch (updateError: any) {
      setError(
        updateError?.response?.data?.message ||
          'Failed to update user status.'
      );
    } finally {
      setUpdatingUserId('');
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspended, verified]);

  return (
    <section className='content-shell'>
      <header className='page-header'>
        <div>
          <h1>Users</h1>
          <p>Manage all registered users and suspend or restore access.</p>
        </div>
        <div className='header-actions'>
          <button type='button' onClick={() => void loadUsers()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className='summary-grid'>
        <article>
          <span>Total matched</span>
          <strong>{total}</strong>
        </article>
        <article>
          <span>Suspended</span>
          <strong>{rows.filter((row) => row.isSuspended).length}</strong>
        </article>
        <article>
          <span>Verified</span>
          <strong>{rows.filter((row) => row.emailVerified).length}</strong>
        </article>
        <article>
          <span>With active sub</span>
          <strong>{rows.filter((row) => row.hasActiveSubscription).length}</strong>
        </article>
      </div>

      <div className='toolbar'>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search email, name, username...'
        />
        <select
          value={suspended}
          onChange={(event) =>
            setSuspended(event.target.value as 'all' | 'active' | 'suspended')
          }
        >
          <option value='all'>All users</option>
          <option value='active'>Not suspended</option>
          <option value='suspended'>Suspended</option>
        </select>
        <select
          value={verified}
          onChange={(event) =>
            setVerified(event.target.value as 'all' | 'verified' | 'unverified')
          }
        >
          <option value='all'>All verification states</option>
          <option value='verified'>Verified</option>
          <option value='unverified'>Unverified</option>
        </select>
        <button type='button' onClick={() => void loadUsers()} disabled={loading}>
          Apply
        </button>
      </div>

      {error ? <div className='error-banner'>{error}</div> : null}

      <div className='table-wrap'>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Account</th>
              <th>Location</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className='cell-muted'>
                  Loading users...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className='cell-muted'>
                  No users found for your filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>
                      {[row.firstName, row.lastName].filter(Boolean).join(' ') ||
                        row.username ||
                        'Unnamed'}
                    </strong>
                    <small>{row.email}</small>
                    <small>ID: {row.id}</small>
                  </td>
                  <td>
                    <small>Created: {formatDate(row.createdAt)}</small>
                    <small>Last login: {formatDate(row.lastLoginAt)}</small>
                    <small>Login count: {row.loginCount}</small>
                  </td>
                  <td>
                    <small>{[row.signupCity, row.signupCountry].filter(Boolean).join(', ') || '-'}</small>
                    <small>Region: {row.signupRegion || '-'}</small>
                  </td>
                  <td>
                    <small>Owned orgs: {row.ownedOrganizationsCount}</small>
                    <small>Member orgs: {row.memberOrganizationsCount}</small>
                    <small>
                      Subscriptions: {row.hasActiveSubscription ? 'Active' : 'None active'}
                    </small>
                  </td>
                  <td>
                    <span className={`status-chip ${row.isSuspended ? 'status-canceled' : 'status-active'}`}>
                      {row.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                    <small>Email: {row.emailVerified ? 'Verified' : 'Unverified'}</small>
                    <small>
                      Reason: {row.suspensionReason || '-'}
                    </small>
                  </td>
                  <td>
                    <button
                      type='button'
                      className='row-action'
                      disabled={updatingUserId === row.id}
                      onClick={() => void toggleUserSuspension(row)}
                    >
                      {updatingUserId === row.id
                        ? 'Updating...'
                        : row.isSuspended
                          ? 'Restore'
                          : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default UsersPage;
