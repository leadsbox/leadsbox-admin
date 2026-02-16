import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// Simple Tab Component
const Tabs = ({ active, onChange, tabs }: { active: string; onChange: (tab: string) => void; tabs: string[] }) => (
  <div className='flex border-b mb-6'>
    {tabs.map((tab: string) => (
      <button key={tab} className={`px-6 py-3 ${active === tab ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => onChange(tab)}>
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    ))}
  </div>
);

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
  const [activeTab, setActiveTab] = useState('discovery');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<ScraperResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  // Campaign State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [templateBody, setTemplateBody] = useState(
    'Hello {{name}}! I saw your business on Google Maps. Are you interested in getting more customers?',
  );
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

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

  const handleCreateCampaign = async () => {
    if (!newCampaignName || !selectedOrgId) return;
    setCreatingCampaign(true);
    try {
      await api.post('/growth/campaigns', {
        name: newCampaignName,
        templateBody,
        type: 'WHATSAPP_OUTBOUND',
        organizationId: selectedOrgId,
      });
      setNewCampaignName('');
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    try {
      await api.post(`/growth/campaigns/${campaignId}/start`, { organizationId: selectedOrgId });
      alert('Campaign started!');
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to start campaign');
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await api.post(`/growth/campaigns/${campaignId}/pause`, { organizationId: selectedOrgId });
      alert('Campaign paused!');
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

  return (
    <div className='p-8'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>Growth Engine (Subscriber Acquisition)</h1>

        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-500'>Operating as:</span>
          <select className='border p-2 rounded bg-white' value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
            {adminProfile?.ownedOrganizations?.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
            {!adminProfile?.ownedOrganizations?.length && <option>No Organizations Found</option>}
          </select>
        </div>
      </div>

      <Tabs active={activeTab} onChange={setActiveTab} tabs={['discovery', 'campaigns', 'leads']} />

      {activeTab === 'discovery' && (
        <div className='bg-white p-6 rounded shadow'>
          <h2 className='text-xl mb-4'>Lead Discovery (Scraper)</h2>
          <div className='flex gap-4 mb-6'>
            <input
              className='border p-2 rounded flex-1'
              placeholder='Search Term (e.g. Plumbers)'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <input
              className='border p-2 rounded flex-1'
              placeholder='Location (e.g. Lagos)'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <button className='bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50' onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search Maps'}
            </button>
          </div>

          {results.length > 0 && (
            <div>
              <div className='flex justify-between items-center mb-2'>
                <h3 className='font-bold'>Results ({results.length})</h3>
                <div className='flex gap-2 items-center'>
                  <select
                    className='border p-2 rounded bg-white text-sm'
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                  >
                    <option value=''>No Campaign (Just Import)</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleImport} className='text-green-600 font-bold border border-green-600 px-3 py-1 rounded'>
                    Import All
                  </button>
                </div>
              </div>
              <div className='grid gap-2'>
                {results.map((r, i) => (
                  <div key={i} className='border p-3 rounded flex justify-between'>
                    <div>
                      <div className='font-bold'>{r.name}</div>
                      <div className='text-sm text-gray-600'>{r.address}</div>
                    </div>
                    <div className='text-right'>
                      <div>{r.phone}</div>
                      <div className='text-xs text-blue-500'>{r.website}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className='bg-white p-6 rounded shadow'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-xl'>Campaigns</h2>
          </div>

          <div className='mb-8 p-4 bg-gray-50 rounded'>
            <h3 className='font-bold mb-2'>Create New Campaign</h3>
            <div className='flex flex-col gap-4'>
              <div className='flex gap-2'>
                <input
                  className='border p-2 rounded flex-1'
                  placeholder='Campaign Name (e.g. Lagos Plumbers Outreach)'
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                />
                <button
                  className='bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50'
                  onClick={handleCreateCampaign}
                  disabled={creatingCampaign || !newCampaignName}
                >
                  {creatingCampaign ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Message Template</label>
                <textarea
                  className='border p-2 rounded w-full h-24 font-mono text-sm'
                  placeholder='Message Template (use {{name}} for lead name)'
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                />
                <p className='text-xs text-gray-500 mt-1'>
                  Variables: {'{{name}}'}, {'{{businessName}}'}
                </p>
              </div>
            </div>
          </div>

          <table className='w-full'>
            <thead>
              <tr className='text-left border-b'>
                <th className='pb-2'>Name</th>
                <th className='pb-2'>Status</th>
                <th className='pb-2'>Leads</th>
                <th className='pb-2'>Created</th>
                <th className='pb-2'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className='border-b'>
                  <td className='py-3 font-medium'>{c.name}</td>
                  <td className='py-3'>
                    <span className={`px-2 py-1 rounded text-xs ${c.status === 'RUNNING' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className='py-3'>{c._count?.leads || 0}</td>
                  <td className='py-3 text-gray-500 text-sm'>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className='py-3'>
                    <div className='flex gap-2 text-sm'>
                      {c.status === 'DRAFT' || c.status === 'PAUSED' ? (
                        <button onClick={() => handleStartCampaign(c.id)} className='text-green-600 hover:underline font-bold'>
                          Start
                        </button>
                      ) : (
                        <button onClick={() => handlePauseCampaign(c.id)} className='text-orange-600 hover:underline font-bold'>
                          Pause
                        </button>
                      )}
                      <button className='text-blue-600 hover:underline'>Manage</button>
                    </div>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={5} className='py-8 text-center text-gray-500'>
                    No campaigns found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GrowthPage;
