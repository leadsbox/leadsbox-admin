import axios from 'axios';
import { getAdminToken, setAdminToken } from './storage';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3010/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      setAdminToken('');
    }
    return Promise.reject(error);
  },
);

// ── Internal Dogfooding Scraper ───────────────────────────────────────────────

export interface ScraperTriggerPayload {
  /** Full search query including niche and location, e.g. "Solar Panel Installers in Lagos" */
  searchQuery: string;
  /** Prisma Organization ID to inject scraped leads into */
  organizationId: string;
  /** Max results to fetch from SerpAPI (default 20) */
  limit?: number;
}

export interface ScraperTriggerResult {
  scraped: number;
  upsertedContacts: number;
  upsertedLeads: number;
  linkedToCampaign: number;
  skipped: number;
  campaignId: string;
}

/**
 * Triggers the internal lead scraper worker on the backend.
 * Dispatches the job synchronously (waits for it to complete).
 */
export const triggerInternalScraper = async (payload: ScraperTriggerPayload): Promise<ScraperTriggerResult> => {
  const res = await api.post<{ success: boolean; data: ScraperTriggerResult }>('/admin/trigger-scraper', payload);
  return res.data.data;
};
