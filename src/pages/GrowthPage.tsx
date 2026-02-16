import { useState, useEffect } from 'react';
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

const GrowthPage = () => {
  const [activeTab, setActiveTab] = useState('discovery');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<ScraperResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    api.get('/admin/auth/me').then((res) => {
      const profile = res.data?.data?.user;
      setAdminProfile(profile);
      if (profile?.ownedOrganizations?.length > 0) {
        setSelectedOrgId(profile.ownedOrganizations[0].id);
      }
    });
  }, []);

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
      await api.post('/growth/leads/import', { leads: results, sourceName: `Map: ${query} in ${location}` });
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
                <button onClick={handleImport} className='text-green-600 font-bold border border-green-600 px-3 py-1 rounded'>
                  Import All
                </button>
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

      {activeTab === 'campaigns' && <div className='text-center p-10 text-gray-500'>Campaign Management coming soon...</div>}
    </div>
  );
};

export default GrowthPage;
