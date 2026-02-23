import { useState, useEffect, useCallback, useRef } from 'react';
import { getSystemAnomalies } from '../lib/api';
import type { Anomaly, AnomalySeverity } from '../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<AnomalySeverity, { bg: string; text: string; border: string }> = {
  High: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.35)' },
  Medium: { bg: 'rgba(249,176,79,0.12)', text: '#fbbf24', border: 'rgba(249,176,79,0.35)' },
  Low: { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
};

const TYPE_LABEL: Record<string, string> = {
  webhook_failure: 'Webhook',
  followup_failure: 'Follow-Up',
  queue_backlog: 'Queue',
};

const TYPE_ICON: Record<string, string> = {
  webhook_failure: '🔌',
  followup_failure: '📩',
  queue_backlog: '⏳',
};

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Component ─────────────────────────────────────────────────────────────────

const Badge = ({ severity }: { severity: AnomalySeverity }) => {
  const c = SEVERITY_COLOR[severity];
  return (
    <span
      style={{
        padding: '2px 10px',
        borderRadius: '20px',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {severity}
    </span>
  );
};

const TypeChip = ({ type }: { type: string }) => (
  <span
    style={{
      padding: '2px 10px',
      borderRadius: '20px',
      fontSize: '0.7rem',
      fontWeight: 600,
      background: 'rgba(78,165,255,0.1)',
      color: 'var(--accent)',
      border: '1px solid rgba(78,165,255,0.2)',
      whiteSpace: 'nowrap' as const,
    }}
  >
    {TYPE_ICON[type] ?? '⚡'} {TYPE_LABEL[type] ?? type}
  </span>
);

const AUTO_POLL_SECONDS = 60;

const AnomaliesPage = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [hours, setHours] = useState(48);
  const [autoPoll, setAutoPoll] = useState(true);
  const [countdown, setCountdown] = useState(AUTO_POLL_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemAnomalies(hours);
      setAnomalies(data.anomalies);
      setGeneratedAt(data.generatedAt);
      setCountdown(AUTO_POLL_SECONDS);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : ((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to load anomalies');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [hours]);

  // Initial load
  useEffect(() => {
    void load();
  }, [load]);

  // Auto-poll + countdown
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (pollRef.current) clearTimeout(pollRef.current);
    if (!autoPoll) return;

    setCountdown(AUTO_POLL_SECONDS);

    countdownRef.current = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    pollRef.current = setTimeout(() => {
      void load();
    }, AUTO_POLL_SECONDS * 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [autoPoll, load, generatedAt]);

  const visible = anomalies.filter((a) => !dismissed.has(a.id));
  const highCount = visible.filter((a) => a.severity === 'High').length;
  const medCount = visible.filter((a) => a.severity === 'Medium').length;
  const lowCount = visible.filter((a) => a.severity === 'Low').length;

  return (
    <section className='content-shell'>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className='page-header'>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>Anomaly Inbox</h1>
            {highCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '20px',
                  padding: '1px 9px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {highCount} HIGH
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Cross-tenant system failures — last{' '}
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              style={{
                background: 'transparent',
                border: '1px solid var(--panel-border)',
                borderRadius: '6px',
                color: 'inherit',
                padding: '1px 6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              {[12, 24, 48, 72, 168].map((h) => (
                <option key={h} value={h}>
                  {h === 168 ? '7 days' : `${h}h`}
                </option>
              ))}
            </select>
          </p>
        </div>

        <div className='header-actions' style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Auto-poll toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <input type='checkbox' checked={autoPoll} onChange={(e) => setAutoPoll(e.target.checked)} />
            Auto-refresh {autoPoll && `(${countdown}s)`}
          </label>

          <button type='button' onClick={() => void load()} disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </header>

      {/* ── Last fetch ─────────────────────────────────────────────────────── */}
      {generatedAt && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
          Last fetched: {new Date(generatedAt).toLocaleString()}
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px',
            padding: '0.9rem 1.25rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <span>⚠️</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Summary chips ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' as const }}>
        {[
          { label: `${highCount} High`, bg: SEVERITY_COLOR.High.bg, text: SEVERITY_COLOR.High.text, border: SEVERITY_COLOR.High.border },
          { label: `${medCount} Medium`, bg: SEVERITY_COLOR.Medium.bg, text: SEVERITY_COLOR.Medium.text, border: SEVERITY_COLOR.Medium.border },
          { label: `${lowCount} Low`, bg: SEVERITY_COLOR.Low.bg, text: SEVERITY_COLOR.Low.text, border: SEVERITY_COLOR.Low.border },
          { label: `${dismissed.size} Dismissed`, bg: 'rgba(30,41,59,0.5)', text: 'var(--text-dim)', border: 'var(--panel-border)' },
        ].map(({ label, bg, text, border }) => (
          <span
            key={label}
            style={{
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: bg,
              color: text,
              border: `1px solid ${border}`,
            }}
          >
            {label}
          </span>
        ))}
        {dismissed.size > 0 && (
          <button
            onClick={() => setDismissed(new Set())}
            style={{
              background: 'transparent',
              border: '1px solid var(--panel-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
              cursor: 'pointer',
            }}
          >
            Restore dismissed
          </button>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!loading && visible.length === 0 && !error && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '240px',
            gap: '0.75rem',
            color: 'var(--text-dim)',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>✅</span>
          <strong>All systems normal</strong>
          <span>No anomalies detected in the last {hours}h.</span>
        </div>
      )}

      {/* ── Anomaly list ───────────────────────────────────────────────────── */}
      {visible.length > 0 && (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {visible.map((anomaly) => {
            const borderColor = SEVERITY_COLOR[anomaly.severity].border;
            return (
              <div
                key={anomaly.id}
                style={{
                  background: 'var(--panel-soft)',
                  border: `1px solid ${borderColor}`,
                  borderLeft: `4px solid ${SEVERITY_COLOR[anomaly.severity].text}`,
                  borderRadius: '10px',
                  padding: '0.9rem 1.1rem',
                  display: 'grid',
                  gridTemplateColumns: 'auto auto 1fr auto',
                  gap: '0.75rem',
                  alignItems: 'center',
                }}
              >
                {/* Severity badge */}
                <Badge severity={anomaly.severity} />

                {/* Type chip */}
                <TypeChip type={anomaly.anomalyType} />

                {/* Main content */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {anomaly.description}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {anomaly.organizationName && <span>🏢 {anomaly.organizationName}</span>}
                    <span>🕐 {relativeTime(anomaly.timestamp)}</span>
                    {anomaly.organizationId && <span style={{ fontFamily: 'monospace' }}>{anomaly.organizationId.slice(0, 16)}…</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {anomaly.organizationId && (
                    <a
                      href={`/organizations?search=${encodeURIComponent(anomaly.organizationId)}`}
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: 'rgba(78,165,255,0.1)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(78,165,255,0.2)',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap' as const,
                      }}
                    >
                      View Org
                    </a>
                  )}
                  <button
                    onClick={() => setDismissed((prev) => new Set([...prev, anomaly.id]))}
                    title='Dismiss'
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AnomaliesPage;
