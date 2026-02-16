import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// --- Styled Components / Icons ---

// Simple Icons (SVG)
const SearchIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
    <path strokeLinecap='round' strokeLinejoin='round' d='m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z' />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
    <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
  </svg>
);

// Tabs Component (Styled)
const Tabs = ({ active, onChange, tabs }: { active: string; onChange: (tab: string) => void; tabs: string[] }) => (
  <div className='flex border-b border-gray-200 mb-6 space-x-8'>
    {tabs.map((tab) => (
      <button
        key={tab}
        className={`pb-4 px-1 text-sm font-medium transition-colors duration-200 border-b-2 ${
          active === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
        onClick={() => onChange(tab)}
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
    <div className='max-w-7xl mx-auto p-6 space-y-8'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Growth Engine</h1>
          <p className='text-sm text-gray-500 mt-1'>Acquire new leads and run automated outreach campaigns.</p>
        </div>

        <div className='flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm'>
          <span className='text-xs font-medium text-gray-500 uppercase tracking-wide px-2'>Operating As</span>
          <select
            className='border-none bg-transparent text-sm font-medium text-gray-900 focus:ring-0 cursor-pointer'
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
          >
            {adminProfile?.ownedOrganizations?.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
            {!adminProfile?.ownedOrganizations?.length && <option>No Organizations Found</option>}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs active={activeTab} onChange={setActiveTab} tabs={['discovery', 'campaigns', 'leads']} />

      {/* Content Area */}
      <div className='bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px]'>
        {/* === Discovery Tab === */}
        {activeTab === 'discovery' && (
          <div className='p-6 space-y-6'>
            <div className='flex flex-col md:flex-row gap-4'>
              <div className='flex-1 relative'>
                <input
                  className='w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                  placeholder='Search Term (e.g. Plumbers, Real Estate Agents)'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <div className='absolute left-3 top-3.5 text-gray-400'>
                  <SearchIcon />
                </div>
              </div>
              <div className='w-full md:w-64'>
                <input
                  className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                  placeholder='Location (e.g. Lagos, Abuja)'
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                className='px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className='animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full'></span>
                    Searching...
                  </>
                ) : (
                  'Search Maps'
                )}
              </button>
            </div>

            {results.length > 0 && (
              <div className='space-y-4 animate-fadeIn'>
                <div className='flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100'>
                  <h3 className='font-semibold text-blue-900'>Found {results.length} Leads</h3>
                  <div className='flex gap-3 items-center'>
                    <select
                      className='border-gray-200 rounded-md text-sm py-1.5 pl-3 pr-8 focus:ring-blue-500 focus:border-blue-500'
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                    >
                      <option value=''>No Campaign (Just Import)</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          Add to: {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleImport}
                      className='bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm'
                    >
                      Import All Leads
                    </button>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {results.map((r, i) => (
                    <div key={i} className='bg-white border hover:border-blue-300 p-5 rounded-lg transition-all hover:shadow-md group'>
                      <div className='flex justify-between items-start mb-2'>
                        <h4 className='font-bold text-gray-900 truncate pr-2' title={r.name}>
                          {r.name}
                        </h4>
                        <span className='bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold'>
                          Map
                        </span>
                      </div>
                      <div className='text-sm text-gray-600 mb-4 h-10 overflow-hidden text-ellipsis line-clamp-2' title={r.address}>
                        {r.address}
                      </div>

                      <div className='space-y-2 text-sm border-t pt-3'>
                        <div className='flex items-center gap-2 text-gray-700'>
                          <svg className='w-4 h-4 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
                            />
                          </svg>
                          <span className='font-mono'>{r.phone}</span>
                        </div>
                        {r.website && (
                          <div className='flex items-center gap-2 text-blue-600'>
                            <svg className='w-4 h-4 text-blue-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
                              />
                            </svg>
                            <a href={r.website} target='_blank' rel='noopener noreferrer' className='hover:underline truncate'>
                              Visit Website
                            </a>
                          </div>
                        )}
                        {!r.website && (
                          <div className='flex items-center gap-2 text-gray-400'>
                            <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
                              />
                            </svg>
                            <span className='italic'>No Website</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 && !loading && (
              <div className='text-center py-20 text-gray-400'>
                <svg className='w-16 h-16 mx-auto mb-4 text-gray-300' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
                <p>Search for businesses above to discover new leads.</p>
              </div>
            )}
          </div>
        )}

        {/* === Campaigns Tab === */}
        {activeTab === 'campaigns' && (
          <div className='p-6'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-lg font-semibold text-gray-900'>Active Campaigns</h2>
              <button
                className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm'
                onClick={() => setIsCreatingCampaign(!isCreatingCampaign)}
              >
                <PlusIcon />
                {isCreatingCampaign ? 'Cancel' : 'Create Campaign'}
              </button>
            </div>

            {/* Create Campaign Form */}
            {isCreatingCampaign && (
              <div className='mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100 animate-slideDown'>
                <h3 className='font-bold text-blue-900 mb-4'>New Campaign Details</h3>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-blue-800 mb-1'>Campaign Name</label>
                    <input
                      className='w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white'
                      placeholder='e.g. Lagos Real Estate Outreach Q1'
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className='flex justify-between items-center mb-1'>
                      <label className='block text-sm font-medium text-blue-800'>Message Template</label>
                      <div className='text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded'>
                        Available Variables: <span className='font-mono'>{'{{name}}'}</span>, <span className='font-mono'>{'{{businessName}}'}</span>
                      </div>
                    </div>
                    <textarea
                      className='w-full p-3 border border-blue-200 rounded-lg h-32 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white'
                      placeholder='Hi {{name}}, ...'
                      value={templateBody}
                      onChange={(e) => setTemplateBody(e.target.value)}
                    />
                  </div>
                  <div className='flex justify-end pt-2'>
                    <button
                      className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all disabled:opacity-50'
                      onClick={handleCreateCampaign}
                      disabled={submittingCampaign || !newCampaignName}
                    >
                      {submittingCampaign ? 'Creating...' : 'Launch Campaign'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Campaigns Table */}
            <div className='overflow-hidden border border-gray-200 rounded-xl'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Name</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Status</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Leads</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Created</th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>Actions</th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {campaigns.map((c) => (
                    <tr key={c.id} className='hover:bg-gray-50 transition-colors'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='font-medium text-gray-900'>{c.name}</div>
                        <div className='text-xs text-gray-500'>{c.type}</div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            c.status === 'RUNNING'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : c.status === 'PAUSED'
                                ? 'bg-orange-100 text-orange-800 border-orange-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{c._count?.leads || 0}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex items-center justify-end gap-3'>
                          {c.status === 'DRAFT' || c.status === 'PAUSED' ? (
                            <button onClick={() => handleStartCampaign(c.id)} className='text-green-600 hover:text-green-800 font-bold'>
                              Start
                            </button>
                          ) : (
                            <button onClick={() => handlePauseCampaign(c.id)} className='text-orange-600 hover:text-orange-900 font-bold'>
                              Pause
                            </button>
                          )}
                          <button className='text-blue-600 hover:text-blue-900'>Manage</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={5} className='px-6 py-12 text-center text-gray-500 italic'>
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
          <div className='p-12 text-center text-gray-400'>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>Lead Management</h3>
            <p>View and filter leads across all campaigns here (Coming Soon).</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GrowthPage;
