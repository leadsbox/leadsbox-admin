import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

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

  // Initial Fetch
  useEffect(() => {
    api.get('/admin/auth/me').then((res) => {
      const profile = res.data?.data?.user;
      setAdminProfile(profile);
      if (profile?.ownedOrganizations?.length > 0) {
        setSelectedOrgId(profile.ownedOrganizations[0].id);
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
      <Tabs active={activeTab} onChange={setActiveTab} tabs={['discovery', 'campaigns', 'leads']} />

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

      {/* === Leads Tab (Placeholder) === */}
      {activeTab === 'leads' && (
        <div className='center-screen' style={{ minHeight: '300px' }}>
          <p>View and filter leads across all campaigns here (Coming Soon).</p>
        </div>
      )}
    </section>
  );
};

export default GrowthPage;
