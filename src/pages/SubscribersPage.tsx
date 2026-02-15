import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type {
  SubscriberRow,
  SubscribersPayload,
  SubscribersSummary,
  SubscriptionStatus,
} from '../types/subscribers';

const statusOptions: Array<{ label: string; value: '' | SubscriptionStatus }> = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Past due', value: 'PAST_DUE' },
  { label: 'Canceled', value: 'CANCELED' },
  { label: 'Expired', value: 'EXPIRED' },
];

const latestOptions: Array<{ label: string; value: 'latest' | 'all' }> = [
  { label: 'Latest per org', value: 'latest' },
  { label: 'All records', value: 'all' },
];

const defaultSummary: SubscribersSummary = {
  totalRows: 0,
  latestOnly: true,
  byStatus: {},
  mrrEstimate: 0,
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatMoney = (amountMajor: number, currency: string): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amountMajor);
  } catch {
    return `${currency} ${amountMajor.toFixed(2)}`;
  }
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const SubscribersPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | SubscriptionStatus>('');
  const [latestOnly, setLatestOnly] = useState<'latest' | 'all'>('latest');
  const [rows, setRows] = useState<SubscriberRow[]>([]);
  const [summary, setSummary] = useState<SubscribersSummary>(defaultSummary);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const loadSubscribers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/metrics/subscribers', {
        params: {
          search: search || undefined,
          status: status || undefined,
          latestOnly: latestOnly === 'latest',
          limit: '1000',
        },
      });
      const payload = response?.data?.data as SubscribersPayload | undefined;
      setRows(payload?.subscribers || []);
      setSummary(payload?.summary || defaultSummary);
    } catch (loadError: any) {
      const statusCode = loadError?.response?.status;
      if (statusCode === 403) {
        setError(
          'Access denied. Add your email to METRICS_ADMIN_EMAILS on the backend.'
        );
      } else {
        setError(loadError?.response?.data?.message || 'Failed to load subscribers.');
      }
      setRows([]);
      setSummary(defaultSummary);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      setDownloading(true);
      const response = await api.get('/metrics/subscribers', {
        params: {
          search: search || undefined,
          status: status || undefined,
          latestOnly: latestOnly === 'latest',
          limit: '5000',
          format: 'csv',
        },
        responseType: 'blob',
      });
      const label = latestOnly === 'latest' ? 'latest' : 'all';
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(response.data, `subscribers-${label}-${date}.csv`);
    } catch (exportError: any) {
      setError(exportError?.response?.data?.message || 'CSV export failed.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    void loadSubscribers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, latestOnly]);

  const activeCount = summary.byStatus.ACTIVE || 0;
  const pendingCount = summary.byStatus.PENDING || 0;
  const mrrLabel = useMemo(() => {
    const firstCurrency = rows.find((row) => row.currency)?.currency || 'NGN';
    return formatMoney(summary.mrrEstimate || 0, firstCurrency);
  }, [rows, summary.mrrEstimate]);

  return (
    <section className='content-shell'>
      <header className='page-header'>
        <div>
          <h1>Subscribers</h1>
          <p>Unified subscription records with subscriber snapshots from billing events.</p>
        </div>
        <div className='header-actions'>
          <button type='button' onClick={() => void loadSubscribers()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type='button' onClick={() => void exportCsv()} disabled={downloading || loading}>
            {downloading ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </header>

      <div className='summary-grid'>
        <article>
          <span>Total rows</span>
          <strong>{summary.totalRows}</strong>
        </article>
        <article>
          <span>Active</span>
          <strong>{activeCount}</strong>
        </article>
        <article>
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </article>
        <article>
          <span>MRR estimate</span>
          <strong>{mrrLabel}</strong>
        </article>
      </div>

      <div className='toolbar'>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search org, email, phone, reference...'
        />

        <select value={status} onChange={(event) => setStatus(event.target.value as '' | SubscriptionStatus)}>
          {statusOptions.map((option) => (
            <option value={option.value} key={option.label}>
              {option.label}
            </option>
          ))}
        </select>

        <select value={latestOnly} onChange={(event) => setLatestOnly(event.target.value as 'latest' | 'all')}>
          {latestOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button type='button' onClick={() => void loadSubscribers()} disabled={loading}>
          Apply
        </button>
      </div>

      {error ? <div className='error-banner'>{error}</div> : null}

      <div className='table-wrap'>
        <table>
          <thead>
            <tr>
              <th>Subscriber</th>
              <th>Organization</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Period End</th>
              <th>Paystack</th>
              <th>Snapshot</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className='cell-muted'>
                  Loading subscriber records...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className='cell-muted'>
                  No subscriber records match your filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.subscriptionId}>
                  <td>
                    <strong>{row.subscriberName || row.ownerName || '-'}</strong>
                    <small>{row.subscriberEmail || row.ownerEmail || '-'}</small>
                    <small>{row.subscriberPhone || '-'}</small>
                    <small>
                      {[row.subscriberCity, row.subscriberCountry].filter(Boolean).join(', ') || '-'}
                    </small>
                  </td>
                  <td>
                    <strong>{row.organizationName}</strong>
                    <small>Owner: {row.ownerEmail}</small>
                    <small>Created: {formatDate(row.organizationCreatedAt)}</small>
                  </td>
                  <td>
                    <strong>{row.planName}</strong>
                    <small>{row.planInterval}</small>
                    <small>ID: {row.planId}</small>
                  </td>
                  <td>
                    <span className={`status-chip status-${row.status.toLowerCase()}`}>
                      {row.status}
                    </span>
                    <small>{row.cancelAtPeriodEnd ? 'Cancels at period end' : 'Auto-renewing'}</small>
                  </td>
                  <td>
                    <strong>{formatMoney(row.amountMajor, row.currency)}</strong>
                    <small>{row.amountMinor} minor units</small>
                  </td>
                  <td>
                    <strong>{formatDate(row.currentPeriodEnd)}</strong>
                    <small>Started: {formatDate(row.startedAt)}</small>
                    <small>Trial ends: {formatDate(row.trialEndsAt)}</small>
                  </td>
                  <td>
                    <small>Customer: {row.paystackCustomerCode || '-'}</small>
                    <small>Subscription: {row.paystackSubscriptionId || '-'}</small>
                    <small>Reference: {row.reference || '-'}</small>
                  </td>
                  <td>
                    <small>Captured: {formatDate(row.subscriberSnapshotAt)}</small>
                    <small>Last login: {formatDate(row.subscriberLastLoginAt)}</small>
                    <small>Updated: {formatDate(row.updatedAt)}</small>
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

export default SubscribersPage;
