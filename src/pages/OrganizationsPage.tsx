import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AdminOrganizationRow, AdminOrganizationsPayload } from '../types/admin';

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const OrganizationsPage = () => {
  const [rows, setRows] = useState<AdminOrganizationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [updatingOrgId, setUpdatingOrgId] = useState('');
  const [error, setError] = useState('');

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/organizations', {
        params: {
          search: search || undefined,
          isActive:
            status === 'all' ? undefined : status === 'active',
          limit: '200',
          offset: '0',
        },
      });
      const payload = response?.data?.data as AdminOrganizationsPayload | undefined;
      setRows(payload?.organizations || []);
      setTotal(payload?.total || 0);
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.message ||
          'Failed to load organizations.'
      );
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrganizationStatus = async (row: AdminOrganizationRow) => {
    try {
      setUpdatingOrgId(row.id);
      await api.patch(`/admin/organizations/${row.id}/status`, {
        isActive: !row.isActive,
      });
      await loadOrganizations();
    } catch (updateError: any) {
      setError(
        updateError?.response?.data?.message ||
          'Failed to update organization status.'
      );
    } finally {
      setUpdatingOrgId('');
    }
  };

  useEffect(() => {
    void loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <section className='content-shell'>
      <header className='page-header'>
        <div>
          <h1>Organizations</h1>
          <p>Manage tenant organizations and control organization activation.</p>
        </div>
        <div className='header-actions'>
          <button type='button' onClick={() => void loadOrganizations()} disabled={loading}>
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
          <span>Active</span>
          <strong>{rows.filter((row) => row.isActive).length}</strong>
        </article>
        <article>
          <span>Inactive</span>
          <strong>{rows.filter((row) => !row.isActive).length}</strong>
        </article>
        <article>
          <span>Owners suspended</span>
          <strong>{rows.filter((row) => row.owner.isSuspended).length}</strong>
        </article>
      </div>

      <div className='toolbar'>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search organization or owner email...'
        />
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as 'all' | 'active' | 'inactive')
          }
        >
          <option value='all'>All organizations</option>
          <option value='active'>Active</option>
          <option value='inactive'>Inactive</option>
        </select>
        <div />
        <button type='button' onClick={() => void loadOrganizations()} disabled={loading}>
          Apply
        </button>
      </div>

      {error ? <div className='error-banner'>{error}</div> : null}

      <div className='table-wrap'>
        <table>
          <thead>
            <tr>
              <th>Organization</th>
              <th>Owner</th>
              <th>Activity</th>
              <th>Subscription</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className='cell-muted'>
                  Loading organizations...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className='cell-muted'>
                  No organizations found for your filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const latestSub = row.subscriptions[0];
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>ID: {row.id}</small>
                      <small>Created: {formatDate(row.createdAt)}</small>
                    </td>
                    <td>
                      <small>{row.owner.email}</small>
                      <small>
                        {[row.owner.firstName, row.owner.lastName]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </small>
                      <small>
                        Owner status: {row.owner.isSuspended ? 'Suspended' : 'Active'}
                      </small>
                    </td>
                    <td>
                      <small>Members: {row._count.members}</small>
                      <small>Leads: {row._count.leads}</small>
                      <small>Sales: {row._count.sales}</small>
                    </td>
                    <td>
                      <small>Status: {latestSub?.status || '-'}</small>
                      <small>
                        Amount:{' '}
                        {latestSub
                          ? `${latestSub.currency} ${(latestSub.amount / 100).toFixed(2)}`
                          : '-'}
                      </small>
                      <small>Period end: {formatDate(latestSub?.currentPeriodEnd)}</small>
                    </td>
                    <td>
                      <span className={`status-chip ${row.isActive ? 'status-active' : 'status-canceled'}`}>
                        {row.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      <small>Updated: {formatDate(row.updatedAt)}</small>
                    </td>
                    <td>
                      <button
                        type='button'
                        className='row-action'
                        disabled={updatingOrgId === row.id}
                        onClick={() => void toggleOrganizationStatus(row)}
                      >
                        {updatingOrgId === row.id
                          ? 'Updating...'
                          : row.isActive
                            ? 'Deactivate'
                            : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default OrganizationsPage;
