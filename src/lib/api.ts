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

// ── Leakage Audit ─────────────────────────────────────────────────────────────

export interface LeakageAuditResult {
  organizationId: string;
  organizationName: string;
  windowDays: number;
  aov: number;
  generatedAt: string;
  totalInquiries: number;
  missedOpportunities: number;
  revenueLeaked: number;
  avgResponseTimeMinutes: number | null;
  responseRate: number;
}

/**
 * Fetches a 7-day revenue leakage audit for a given org.
 * @param organizationId  Prisma org ID of the client
 * @param aov             Average Order Value in dollars (default 100)
 * @param days            Lookback window in days (1–30, default 7)
 */
export const getLeakageAudit = async (organizationId: string, aov = 100, days = 7): Promise<LeakageAuditResult> => {
  const res = await api.get<{ success: boolean; data: LeakageAuditResult }>(`/admin/analytics/leakage-audit/${organizationId}`, {
    params: { aov, days },
  });
  return res.data.data;
};
