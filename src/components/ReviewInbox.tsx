import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { api } from '../lib/api';
import type { ReviewInboxResponse } from '../types/admin';

export const ReviewInbox = () => {
  const [inbox, setInbox] = useState<ReviewInboxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadInbox = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales/review/inbox?limit=10');
      setInbox(res.data.data);
    } catch (err) {
      console.error('Failed to load review inbox', err);
      // Silent fail or low priority error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInbox();
  }, []);

  const handleApprove = async (saleId: string) => {
    try {
      setActioning(saleId);
      await api.post(`/sales/${saleId}/approve`);
      // Refresh
      void loadInbox();
    } catch (err) {
      const message = (err as AxiosError<{ message: string }>)?.response?.data?.message || 'Failed to approve sale';
      setError(message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (saleId: string) => {
    if (!confirm('Are you sure you want to reject this sale?')) return;

    try {
      setActioning(saleId);
      await api.post(`/sales/${saleId}/reject`, { reason: 'Admin rejected from dashboard' });
      // Refresh
      void loadInbox();
    } catch (err) {
      const message = (err as AxiosError<{ message: string }>)?.response?.data?.message || 'Failed to reject sale';
      setError(message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setActioning(null);
    }
  };

  if (!inbox || inbox.sales.length === 0) {
    if (loading) return <div className='p-4 text-center'>Loading pending reviews...</div>;
    return null; // Don't show if empty
  }

  return (
    <div className='review-inbox card'>
      <div className='card-header'>
        <h3>Pending Sales Review ({inbox.summary.pendingCount})</h3>
        {error && <span className='error-text'>{error}</span>}
      </div>

      <div className='table-responsive'>
        <table className='data-table'>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inbox.sales.map((sale) => (
              <tr key={sale.id}>
                <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                <td>{sale.lead.contact?.displayName || sale.lead.contact?.phone || 'Unknown'}</td>
                <td>
                  {sale.items
                    .map((i) => `${i.quantity}x ${i.name}`)
                    .join(', ')
                    .slice(0, 50)}
                  {sale.items.length > 2 ? '...' : ''}
                </td>
                <td>
                  {sale.currency} {sale.amount.toLocaleString()}
                </td>
                <td>{sale.detectionConfidence ? Math.round(sale.detectionConfidence * 100) : 0}%</td>
                <td>
                  <div className='actions'>
                    <button className='btn-primary btn-sm' onClick={() => void handleApprove(sale.id)} disabled={actioning === sale.id}>
                      {actioning === sale.id ? '...' : 'Approve'}
                    </button>
                    <button className='btn-danger btn-sm' onClick={() => void handleReject(sale.id)} disabled={actioning === sale.id}>
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .review-inbox {
          margin-top: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 1rem;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .card-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th, .data-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
          border-radius: 4px;
          cursor: pointer;
          border: none;
          margin-right: 0.5rem;
        }
        .btn-primary {
          background-color: #2563eb;
          color: white;
        }
        .btn-danger {
          background-color: #dc2626;
          color: white;
        }
        .actions {
          display: flex;
        }
        .error-text {
          color: #dc2626;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};
