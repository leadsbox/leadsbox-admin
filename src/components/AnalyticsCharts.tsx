import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import type { AdminAnalytics } from '../types/admin';

interface AnalyticsChartsProps {
  data: AdminAnalytics;
}

export const AnalyticsCharts = ({ data }: AnalyticsChartsProps) => {
  // Combine user and org growth for comparison if dates align, or just render side-by-side
  // For simplicity, let's render 3 charts in a grid

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className='analytics-grid'>
      <div className='chart-card'>
        <h3>User Growth (30d)</h3>
        <div className='chart-container'>
          <ResponsiveContainer width='100%' height={300}>
            <LineChart data={data.dailyUsers}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} />
              <XAxis dataKey='date' tickFormatter={formatDate} minTickGap={30} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(label: unknown) => formatDate(label as string)}
                formatter={(value: number | undefined) => [value, 'New Users']}
              />
              <Line type='monotone' dataKey='count' stroke='#2563eb' strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className='chart-card'>
        <h3>Organization Growth (30d)</h3>
        <div className='chart-container'>
          <ResponsiveContainer width='100%' height={300}>
            <LineChart data={data.dailyOrgs}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} />
              <XAxis dataKey='date' tickFormatter={formatDate} minTickGap={30} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(label: unknown) => formatDate(label as string)}
                formatter={(value: number | undefined) => [value, 'New Orgs']}
              />
              <Line type='monotone' dataKey='count' stroke='#16a34a' strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.dailyRevenue && (
        <>
          <div className='chart-card full-width'>
            <h3>Revenue Trend (30d)</h3>
            <div className='chart-container'>
              <ResponsiveContainer width='100%' height={300}>
                <AreaChart data={data.dailyRevenue}>
                  <defs>
                    <linearGradient id='colorRevenue' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#10b981' stopOpacity={0.8} />
                      <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} />
                  <XAxis dataKey='date' tickFormatter={formatDate} minTickGap={30} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₦${value / 1000}k`} />
                  <Tooltip
                    labelFormatter={(label: unknown) => formatDate(label as string)}
                    formatter={(value: number | undefined) => [
                      new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value || 0),
                      'Revenue',
                    ]}
                  />
                  <Area type='monotone' dataKey='amount' stroke='#10b981' fillOpacity={1} fill='url(#colorRevenue)' />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='chart-card'>
            <h3>Daily Sales Volume (30d)</h3>
            <div className='chart-container'>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={data.dailyRevenue}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} />
                  <XAxis dataKey='date' tickFormatter={formatDate} minTickGap={30} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(label: unknown) => formatDate(label as string)}
                    formatter={(value: number | undefined) => [value || 0, 'Sales Count']}
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey='count' fill='#f59e0b' radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div className='chart-card full-width'>
        <h3>Message Volume (30d)</h3>
        <div className='chart-container'>
          <ResponsiveContainer width='100%' height={300}>
            <BarChart data={data.dailyMessages}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} />
              <XAxis dataKey='date' tickFormatter={formatDate} minTickGap={30} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(label: unknown) => formatDate(label as string)}
                formatter={(value: number | undefined) => [value, 'Messages']}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey='count' fill='#8b5cf6' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .chart-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .chart-card h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
        }
        .full-width {
          grid-column: 1 / -1;
        }
        @media (prefers-color-scheme: dark) {
          .chart-card {
            background: #1e293b;
            border-color: #334155;
          }
          .chart-card h3 {
            color: #f1f5f9;
          }
        }
      `}</style>
    </div>
  );
};
