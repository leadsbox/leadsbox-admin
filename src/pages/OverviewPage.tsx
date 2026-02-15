import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AdminOverview } from '../types/admin';

const defaultOverview: AdminOverview = {
  generatedAt: '',
  users: { total: 0, active30d: 0, suspended: 0 },
  organizations: { total: 0, active: 0 },
  subscriptions: { active: 0, pendingOrPastDue: 0, mrrMajor: 0 },
};

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const OverviewPage = () => {
  const [overview, setOverview] = useState<AdminOverview>(defaultOverview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/overview');
      const payload = response?.data?.data as AdminOverview | undefined;
      setOverview(payload || defaultOverview);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || 'Failed to load overview.');
      setOverview(defaultOverview);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  return (
    <section className='content-shell'>
      <header className='page-header'>
        <div>
          <h1>Admin Overview</h1>
          <p>High-level operating metrics across users, organizations, and subscriptions.</p>
        </div>
        <div className='header-actions'>
          <button type='button' onClick={() => void loadOverview()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {error ? <div className='error-banner'>{error}</div> : null}

      <div className='summary-grid'>
        <article>
          <span>Total users</span>
          <strong>{overview.users.total}</strong>
        </article>
        <article>
          <span>Active users (30d)</span>
          <strong>{overview.users.active30d}</strong>
        </article>
        <article>
          <span>Suspended users</span>
          <strong>{overview.users.suspended}</strong>
        </article>
        <article>
          <span>Total organizations</span>
          <strong>{overview.organizations.total}</strong>
        </article>
        <article>
          <span>Active organizations</span>
          <strong>{overview.organizations.active}</strong>
        </article>
        <article>
          <span>Active subscriptions</span>
          <strong>{overview.subscriptions.active}</strong>
        </article>
        <article>
          <span>Pending/Past due</span>
          <strong>{overview.subscriptions.pendingOrPastDue}</strong>
        </article>
        <article>
          <span>MRR</span>
          <strong>{formatMoney(overview.subscriptions.mrrMajor)}</strong>
        </article>
      </div>
    </section>
  );
};

export default OverviewPage;
