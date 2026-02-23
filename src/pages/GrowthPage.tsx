import { useState, useEffect, useCallback } from 'react';
import { api, triggerInternalScraper, getLeakageAudit } from '../lib/api';
import type { ScraperTriggerResult, LeakageAuditResult } from '../lib/api';

// --- Styled Components / Icons (Inline styles for now to match App.css patterns) ---

const SearchIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    fill='none'
    viewBox='0 0 24 24'
    strokeWidth={1.5}
    stroke='currentColor'
    style={{ width: '1.2rem', height: '1.2rem' }}
  >
    <path strokeLinecap='round' strokeLinejoin='round' d='m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z' />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    fill='none'
    viewBox='0 0 24 24'
    strokeWidth={1.5}
    stroke='currentColor'
    style={{ width: '1.1rem', height: '1.1rem' }}
  >
    <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
  </svg>
);

// Tabs Component (Using CSS Modules approach usually, but here inline for simplicity with App.css vars)
const Tabs = ({ active, onChange, tabs }: { active: string; onChange: (tab: string) => void; tabs: string[] }) => (
  <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--panel-border)', marginBottom: '1.5rem' }}>
    {tabs.map((tab) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        style={{
          background: 'transparent',
          border: 'none',
          borderBottom: active === tab ? '2px solid var(--accent)' : '2px solid transparent',
          color: active === tab ? 'var(--accent)' : 'var(--text-dim)',
          padding: '0.8rem 1rem',
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'all 0.2s',
          borderRadius: 0, // Override default button border-radius
        }}
      >
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    ))}
  </div>
);

// --- Interfaces ---

interface ScraperResult {
  name: string;
  phone: string;
  address?: string;
  website?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface AdminProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  ownedOrganizations: Organization[];
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  createdAt: string;
  templateBody?: string;
  _count?: {
    leads: number;
  };
}

const GrowthPage = () => {
  // State
  const [activeTab, setActiveTab] = useState('discovery');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<ScraperResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  // Campaign State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [templateBody, setTemplateBody] = useState(
    'Hello {{name}}! I saw your business on Google Maps. Are you interested in getting more customers?',
  );
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  // Dogfooding Scraper State
  const [scraperQuery, setScraperQuery] = useState('');
  const [scraperOrgId, setScraperOrgId] = useState('');
  const [scraperLimit, setScraperLimit] = useState(20);
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperResult, setScraperResult] = useState<ScraperTriggerResult | null>(null);
  const [scraperError, setScraperError] = useState<string | null>(null);

  // Revenue Leakage Audit State
  const [auditOrgId, setAuditOrgId] = useState('');
  const [auditAov, setAuditAov] = useState(100);
  const [auditDays, setAuditDays] = useState(7);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<LeakageAuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Initial Fetch
  useEffect(() => {
    api.get('/admin/auth/me').then((res) => {
      const profile = res.data?.data?.user;
      setAdminProfile(profile);
      if (profile?.ownedOrganizations?.length > 0) {
        const firstOrgId = profile.ownedOrganizations[0].id as string;
        setSelectedOrgId(firstOrgId);
        // Pre-fill scraper org ID with the first owned org for convenience
        setScraperOrgId(firstOrgId);
      }
    });
  }, []);

  const fetchCampaigns = useCallback(async () => {
    if (!selectedOrgId) return;
    try {
      const res = await api.get(`/growth/campaigns?organizationId=${selectedOrgId}`);
      setCampaigns(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchCampaigns();
    }
  }, [selectedOrgId, fetchCampaigns]);

  // --- Handlers ---

  const handleCreateCampaign = async () => {
    if (!newCampaignName || !selectedOrgId) return;
    setSubmittingCampaign(true);
    try {
      await api.post('/growth/campaigns', {
        name: newCampaignName,
        templateBody,
        type: 'WHATSAPP_OUTBOUND',
        organizationId: selectedOrgId,
      });
      setNewCampaignName('');
      setIsCreatingCampaign(false); // Close form
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to create campaign');
    } finally {
      setSubmittingCampaign(false);
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to start this campaign? It will begin processing immediately.')) return;
    try {
      await api.post(`/growth/campaigns/${campaignId}/start`, { organizationId: selectedOrgId });
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to start campaign');
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await api.post(`/growth/campaigns/${campaignId}/pause`, { organizationId: selectedOrgId });
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to pause campaign');
    }
  };

  const handleSearch = async () => {
    if (!selectedOrgId) {
      alert('Please select an Organization context first');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/growth/search', { query, location, organizationId: selectedOrgId });
      setResults(res.data?.data || []);
    } catch (err) {
      console.error(err);
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (results.length === 0) return;
    if (!confirm(`Import ${results.length} leads${selectedCampaignId ? ' to selected campaign' : ''}?`)) return;

    try {
      await api.post('/growth/leads/import', {
        leads: results,
        sourceName: `Map: ${query} in ${location}`,
        organizationId: selectedOrgId,
        campaignId: selectedCampaignId || undefined,
      });
      alert('Leads imported successfully!');
      setResults([]);
    } catch (err) {
      console.log(err);
      alert('Import failed');
    }
  };

  const handleRunScraper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scraperQuery.trim() || !scraperOrgId.trim()) return;

    setScraperLoading(true);
    setScraperResult(null);
    setScraperError(null);

    try {
      const result = await triggerInternalScraper({
        searchQuery: scraperQuery.trim(),
        organizationId: scraperOrgId.trim(),
        limit: scraperLimit,
      });
      setScraperResult(result);
      setScraperQuery('');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'The scraper job failed. Check that the backend is reachable and SERPAPI_KEY is set.';
      setScraperError(message);
    } finally {
      setScraperLoading(false);
    }
  };

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditOrgId.trim()) return;
    setAuditLoading(true);
    setAuditResult(null);
    setAuditError(null);
    try {
      const result = await getLeakageAudit(auditOrgId.trim(), auditAov, auditDays);
      setAuditResult(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : ((err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to generate report. Check the org ID is correct and the backend is running.');
      setAuditError(message);
    } finally {
      setAuditLoading(false);
    }
  };

  // --- Render ---

  return (
    <section className='content-shell'>
      {/* Header */}
      <header className='page-header'>
        <div>
          <h1>Growth Engine</h1>
          <p>Acquire new leads and run automated outreach campaigns.</p>
        </div>

        <div className='header-actions'>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(22, 45, 77, 0.75)',
              padding: '0 0.75rem',
              borderRadius: '10px',
              border: '1px solid rgba(78, 165, 255, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Operating As</span>
            <select
              style={{ border: 'none', background: 'transparent', height: '2.2rem', padding: 0, fontWeight: 500, cursor: 'pointer', outline: 'none' }}
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
            >
              {adminProfile?.ownedOrganizations?.map((org) => (
                <option key={org.id} value={org.id} style={{ color: 'black' }}>
                  {org.name}
                </option>
              ))}
              {!adminProfile?.ownedOrganizations?.length && <option style={{ color: 'black' }}>No Organizations Found</option>}
            </select>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs active={activeTab} onChange={setActiveTab} tabs={['discovery', 'campaigns', 'leads', 'dogfooding', 'audit']} />

      {/* === Discovery Tab === */}
      {activeTab === 'discovery' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Search Bar */}
          <div className='toolbar' style={{ gridTemplateColumns: 'minmax(200px, 2fr) minmax(150px, 1fr) auto', gap: '1rem' }}>
            <div className='field-wrap' style={{ display: 'flex', alignItems: 'center', paddingLeft: '0.5rem' }}>
              <div style={{ color: 'var(--text-dim)', marginRight: '0.5rem', display: 'flex' }}>
                <SearchIcon />
              </div>
              <input
                style={{ border: 'none', background: 'transparent', width: '100%', paddingLeft: 0 }}
                placeholder='Search Term (e.g. Plumbers, Real Estate Agents)'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <input
              placeholder='Location (e.g. Lagos)'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={loading} style={{ height: '2.35rem', whiteSpace: 'nowrap' }}>
              {loading ? 'Searching...' : 'Search Maps'}
            </button>
          </div>

          {/* Results Header */}
          {results.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                background: 'var(--panel-soft)',
                borderRadius: '12px',
                border: '1px solid var(--panel-border)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Found {results.length} Leads</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select
                  style={{ width: '250px', borderColor: 'rgba(78, 165, 255, 0.3)' }}
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                >
                  <option value='' style={{ color: 'black' }}>
                    No Campaign (Just Import)
                  </option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id} style={{ color: 'black' }}>
                      Add to: {c.name}
                    </option>
                  ))}
                </select>
                <button onClick={handleImport} style={{ background: 'linear-gradient(90deg, #44d39e, #3db88b)', border: 'none', fontWeight: 600 }}>
                  Import All Leads
                </button>
              </div>
            </div>
          )}

          {/* Results Grid */}
          <div className='summary-grid' style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {results.map((r, i) => (
              <article key={i} style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <strong
                    style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}
                    title={r.name}
                  >
                    {r.name}
                  </strong>
                  <span className='status-chip status-active' style={{ fontSize: '0.65rem' }}>
                    MAP
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-dim)',
                    marginBottom: '1rem',
                    height: '2.4rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                  title={r.address}
                >
                  {r.address}
                </div>

                <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '0.8rem', display: 'grid', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-dim)' }}>📞</span>
                    <span style={{ fontFamily: 'monospace' }}>{r.phone}</span>
                  </div>
                  {r.website ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--accent)' }}>🌐</span>
                      <a href={r.website} target='_blank' rel='noopener noreferrer' style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                        Visit Website
                      </a>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-dim)',
                        fontStyle: 'italic',
                      }}
                    >
                      <span>🌐</span> No Website
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>

          {results.length === 0 && !loading && (
            <div className='center-screen' style={{ minHeight: '300px' }}>
              <div style={{ opacity: 0.5 }}>
                <SearchIcon />
              </div>
              <p>Search for businesses above to discover new leads.</p>
            </div>
          )}
        </div>
      )}

      {/* === Campaigns Tab === */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Active Campaigns</h2>
            <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setIsCreatingCampaign(!isCreatingCampaign)}>
              <PlusIcon />
              {isCreatingCampaign ? 'Cancel' : 'Create Campaign'}
            </button>
          </div>

          {/* Create Campaign Form */}
          {isCreatingCampaign && (
            <div
              style={{
                background: 'var(--panel-soft)',
                border: '1px solid var(--panel-border)',
                borderRadius: '14px',
                padding: '1.5rem',
                display: 'grid',
                gap: '1.5rem',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Campaign Name</label>
                <input
                  style={{ width: '100%', height: '2.8rem' }}
                  placeholder='e.g. Lagos Real Estate Outreach Q1'
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Message Template</label>
                  <small style={{ color: 'var(--accent)' }}>
                    Variables: {'{{name}}'}, {'{{businessName}}'}
                  </small>
                </div>
                <textarea
                  style={{
                    width: '100%',
                    height: '120px',
                    borderRadius: '10px',
                    border: '1px solid var(--panel-border)',
                    background: 'rgba(14, 29, 52, 0.82)',
                    color: 'var(--text)',
                    padding: '1rem',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }}
                  placeholder='Hi {{name}}, ...'
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleCreateCampaign} disabled={submittingCampaign || !newCampaignName} style={{ width: 'auto', padding: '0 2rem' }}>
                  {submittingCampaign ? 'Creating...' : 'Launch Campaign'}
                </button>
              </div>
            </div>
          )}

          {/* Campaigns Table */}
          <div className='table-wrap'>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Leads</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <small>{c.type}</small>
                    </td>
                    <td>
                      <span
                        className={`status-chip ${
                          c.status === 'RUNNING' ? 'status-active' : c.status === 'PAUSED' ? 'status-pending' : 'status-canceled' // defaulting draft to canceled style for visual distinction
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td>{c._count?.leads || 0}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {c.status === 'DRAFT' || c.status === 'PAUSED' ? (
                          <button
                            onClick={() => handleStartCampaign(c.id)}
                            className='row-action'
                            style={{ color: 'var(--success)', borderColor: 'rgba(68, 211, 158, 0.3)' }}
                          >
                            Start
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePauseCampaign(c.id)}
                            className='row-action'
                            style={{ color: 'var(--warn)', borderColor: 'rgba(249, 176, 79, 0.3)' }}
                          >
                            Pause
                          </button>
                        )}
                        <button className='row-action'>Manage</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={5} className='cell-muted' style={{ padding: '3rem' }}>
                      No campaigns found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className='center-screen' style={{ minHeight: '300px' }}>
          <p>View and filter leads across all campaigns here (Coming Soon).</p>
        </div>
      )}

      {/* === Dogfooding Tab — Internal Lead Scraper === */}
      {activeTab === 'dogfooding' && (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '720px' }}>
          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Internal Lead Scraper</h2>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: 'rgba(249, 176, 79, 0.15)',
                  color: 'var(--warn)',
                  border: '1px solid rgba(249, 176, 79, 0.35)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                }}
              >
                Dogfooding
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Scrapes Google Maps via SerpAPI, upserts leads to the target org, generates AI-personalised niche hooks, and fires the{' '}
              <strong>7-Day Revenue Leakage Audit</strong> outreach campaign immediately.
            </p>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleRunScraper}
            style={{
              background: 'var(--panel-soft)',
              border: '1px solid var(--panel-border)',
              borderRadius: '14px',
              padding: '1.75rem',
              display: 'grid',
              gap: '1.25rem',
            }}
          >
            {/* Search Query */}
            <div>
              <label htmlFor='scraper-query' style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Search Query
              </label>
              <input
                id='scraper-query'
                value={scraperQuery}
                onChange={(e) => setScraperQuery(e.target.value)}
                placeholder='e.g. Luxury Real Estate Agencies in Lagos'
                required
                style={{ width: '100%', height: '2.8rem' }}
              />
              <small style={{ color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
                Include both niche <em>and</em> location — passed directly to Google Maps via SerpAPI.
              </small>
            </div>

            {/* Org ID */}
            <div>
              <label htmlFor='scraper-org-id' style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Target Organization ID
              </label>
              <input
                id='scraper-org-id'
                value={scraperOrgId}
                onChange={(e) => setScraperOrgId(e.target.value)}
                placeholder='e.g. clxxxxxxxxxxxxxx'
                required
                style={{ width: '100%', height: '2.8rem', fontFamily: 'monospace', fontSize: '0.875rem' }}
              />
              <small style={{ color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
                The LeadsBox internal org that will own these leads. Contacts and the audit campaign are created under this org.
              </small>
            </div>

            {/* Limit */}
            <div>
              <label htmlFor='scraper-limit' style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Max Results
                <span style={{ fontWeight: 400, color: 'var(--text-dim)', marginLeft: '0.5rem' }}>(1–50)</span>
              </label>
              <input
                id='scraper-limit'
                type='number'
                min={1}
                max={50}
                value={scraperLimit}
                onChange={(e) => setScraperLimit(Number(e.target.value))}
                style={{ width: '100px', height: '2.8rem' }}
              />
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type='submit'
                disabled={scraperLoading || !scraperQuery.trim() || !scraperOrgId.trim()}
                style={{
                  width: 'auto',
                  padding: '0 2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  opacity: scraperLoading ? 0.7 : 1,
                }}
              >
                {scraperLoading ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '1em',
                        height: '1em',
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Running Scraper…
                  </>
                ) : (
                  'Run Scraper & Dispatch Campaign'
                )}
              </button>
            </div>
          </form>

          {/* Success banner */}
          {scraperResult && (
            <div
              style={{
                background: 'rgba(68, 211, 158, 0.08)',
                border: '1px solid rgba(68, 211, 158, 0.35)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✅</span>
                <strong style={{ color: 'var(--success)', fontSize: '1rem' }}>Scraper job dispatched successfully!</strong>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {(
                  [
                    { label: 'Scraped', value: scraperResult.scraped },
                    { label: 'Contacts', value: scraperResult.upsertedContacts },
                    { label: 'Leads', value: scraperResult.upsertedLeads },
                    { label: 'In Campaign', value: scraperResult.linkedToCampaign },
                    { label: 'Skipped', value: scraperResult.skipped },
                  ] as const
                ).map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      background: 'rgba(14, 29, 52, 0.6)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{label}</div>
                  </div>
                ))}
              </div>
              <small style={{ color: 'var(--text-dim)' }}>
                Campaign ID: <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent)' }}>{scraperResult.campaignId}</code>.
                The first 5 leads are being contacted now. The rest will drain via the 2-min cron.
              </small>
            </div>
          )}

          {/* Error banner */}
          {scraperError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⚠️</span>
              <div>
                <strong style={{ color: '#f87171' }}>Scraper failed</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-dim)' }}>{scraperError}</p>
              </div>
              <button
                onClick={() => setScraperError(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-label='Dismiss error'
              >
                ×
              </button>
            </div>
          )}

          {/* Inline spinner keyframe */}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* === Audit Tab — Revenue Leakage Report (Presentation Mode) === */}
      {activeTab === 'audit' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1.5rem' }}>💸</span>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Revenue Leakage Audit</h2>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: 'rgba(239,68,68,0.12)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                }}
              >
                Presentation Mode
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Paste the client org ID, set their estimated deal value, and generate the financial report to share on screen during your Day 7 Zoom
              close.
            </p>
          </div>

          {/* Controls */}
          <form
            onSubmit={handleRunAudit}
            style={{
              background: 'var(--panel-soft)',
              border: '1px solid var(--panel-border)',
              borderRadius: '14px',
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: '1rem',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>Client Organization ID</label>
              <input
                value={auditOrgId}
                onChange={(e) => setAuditOrgId(e.target.value)}
                placeholder='clxxxxxxxxxxxxxx'
                required
                style={{ width: '100%', height: '2.6rem', fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>Avg Order Value ($)</label>
              <input
                type='number'
                min={1}
                value={auditAov}
                onChange={(e) => setAuditAov(Number(e.target.value))}
                style={{ width: '110px', height: '2.6rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>Window (days)</label>
              <input
                type='number'
                min={1}
                max={30}
                value={auditDays}
                onChange={(e) => setAuditDays(Number(e.target.value))}
                style={{ width: '90px', height: '2.6rem' }}
              />
            </div>
            <button
              type='submit'
              disabled={auditLoading || !auditOrgId.trim()}
              style={{
                height: '2.6rem',
                padding: '0 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: auditLoading ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {auditLoading ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '0.9em',
                      height: '0.9em',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  Generating…
                </>
              ) : (
                'Generate Report'
              )}
            </button>
          </form>

          {/* Error */}
          {auditError && (
            <div
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-dim)' }}>{auditError}</p>
              <button
                onClick={() => setAuditError(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Report */}
          {auditResult && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Report header bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.5rem',
                  background: 'var(--panel-soft)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{auditResult.organizationName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    Last {auditResult.windowDays} days · AOV ${auditResult.aov.toLocaleString()} · Generated{' '}
                    {new Date(auditResult.generatedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAuditResult(null);
                    setAuditOrgId('');
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '0.4rem 1rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Reset
                </button>
              </div>

              {/* 🔴 Hero metric */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '3.5rem 2rem',
                  background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.14) 0%, transparent 72%)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  borderRadius: '20px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#f87171',
                    marginBottom: '1rem',
                  }}
                >
                  ⚠️ Estimated Revenue Leaked — Last {auditResult.windowDays} Days
                </div>
                <div
                  style={{
                    fontSize: 'clamp(3.5rem, 10vw, 7rem)',
                    fontWeight: 900,
                    color: '#ef4444',
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    textShadow: '0 0 80px rgba(239,68,68,0.5)',
                  }}
                >
                  ${auditResult.revenueLeaked.toLocaleString()}
                </div>
                <div style={{ marginTop: '1.25rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                  {auditResult.missedOpportunities} missed or slow-reply conversations &times; ${auditResult.aov} AOV
                </div>
              </div>

              {/* Supporting stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '1rem' }}>
                {(
                  [
                    {
                      icon: '📨',
                      label: 'Total Inquiries',
                      value: auditResult.totalInquiries.toLocaleString(),
                      sub: `In last ${auditResult.windowDays} days`,
                      color: 'var(--accent)',
                    },
                    {
                      icon: '🔕',
                      label: 'Missed / Late Replies',
                      value: auditResult.missedOpportunities.toLocaleString(),
                      sub: 'No reply or > 4 hours',
                      color: '#f87171',
                    },
                    {
                      icon: '⚡',
                      label: 'Response Rate',
                      value: `${auditResult.responseRate}%`,
                      sub: 'Timely first replies',
                      color: auditResult.responseRate >= 80 ? 'var(--success)' : 'var(--warn)',
                    },
                    {
                      icon: '⏱️',
                      label: 'Avg Response Time',
                      value:
                        auditResult.avgResponseTimeMinutes != null
                          ? auditResult.avgResponseTimeMinutes >= 60
                            ? `${Math.floor(auditResult.avgResponseTimeMinutes / 60)}h ${auditResult.avgResponseTimeMinutes % 60}m`
                            : `${auditResult.avgResponseTimeMinutes}m`
                          : 'N/A',
                      sub: 'First reply latency',
                      color: 'var(--text-dim)',
                    },
                  ] as const
                ).map(({ icon, label, value, sub, color }) => (
                  <div
                    key={label}
                    style={{
                      background: 'var(--panel-soft)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '14px',
                      padding: '1.25rem',
                    }}
                  >
                    <div style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{icon}</div>
                    <div style={{ fontSize: '1.9rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.4rem' }}>{label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Sales pitch cue */}
              <div
                style={{
                  background: 'rgba(78,165,255,0.06)',
                  border: '1px solid rgba(78,165,255,0.2)',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-dim)',
                  lineHeight: 1.75,
                }}
              >
                <strong style={{ color: 'var(--accent)' }}>💡 Close script:</strong> "In the last {auditResult.windowDays} days, your team missed or
                delayed {auditResult.missedOpportunities} customer conversations. At your average deal size of ${auditResult.aov}, that's an estimated{' '}
                <strong style={{ color: '#f87171' }}>${auditResult.revenueLeaked.toLocaleString()}</strong> in potential revenue that walked out the
                door. Our AI plugs that leak 24/7 — for a fraction of what you just lost this week."
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default GrowthPage;
