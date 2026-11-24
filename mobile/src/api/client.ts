import { Platform } from 'react-native';
import {
  AuthUser,
  DailyEntry,
  DashboardData,
  SettlementReport,
  ReportSummary,
  UserSettings,
  BillLedger,
  ClosedBill
} from '../types';

// Default host for local development:
// Android Emulator uses 10.0.2.2 to connect to host computer's localhost
const DEFAULT_HOST = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  default: 'http://localhost:3000/api',
});

let API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_HOST;
// Set after sign-in. The server requires a valid Supabase session (demo tokens work only
// against a local server without Supabase configured).
let authToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiresAt = 0; // seconds since epoch

export const setApiBaseUrl = (url: string) => {
  API_BASE_URL = url.replace(/\/+$/, '');
};

export const getApiBaseUrl = () => API_BASE_URL;

type AuthChangeListener = (token: string | null) => void;
let authListeners: AuthChangeListener[] = [];

export const onAuthChange = (listener: AuthChangeListener) => {
  authListeners.push(listener);
  return () => {
    authListeners = authListeners.filter(l => l !== listener);
  };
};

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (!token) {
    refreshToken = null;
    tokenExpiresAt = 0;
  }
  authListeners.forEach(listener => listener(token));
};

interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

const setSession = (session: AuthSession) => {
  refreshToken = session.refresh_token || null;
  tokenExpiresAt = session.expires_at || 0;
  setAuthToken(session.access_token);
};

type RenewalResult = 'ok' | 'expired' | 'unavailable';
let renewal: Promise<RenewalResult> | null = null;

async function renewSession(): Promise<RenewalResult> {
  if (!refreshToken) return 'expired';
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (response.status === 400 || response.status === 401) return 'expired';
    if (!response.ok) return 'unavailable';
    const json = await response.json();
    if (!json.data?.session?.access_token) return 'unavailable';
    setSession(json.data.session);
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

// Requests that fail together share one renewal: refresh tokens are single-use
const refreshAuth = (): Promise<RenewalResult> => {
  if (!renewal) {
    renewal = renewSession().finally(() => {
      renewal = null;
    });
  }
  return renewal;
};

export const getAuthToken = () => authToken;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/signup');
  const isLogout = endpoint.startsWith('/auth/logout');

  // Renew shortly before the access token expires
  if (!isAuthEndpoint && authToken && refreshToken && tokenExpiresAt && tokenExpiresAt - Date.now() / 1000 < 60) {
    if ((await refreshAuth()) === 'expired') {
      if (!isLogout) setAuthToken(null);
      throw new Error('Your session has expired. Please sign in again.');
    }
  }

  let url = `${API_BASE_URL}${endpoint}`;

  if (options.params) {
    const query = Object.entries(options.params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (query) {
      url += (url.includes('?') ? '&' : '?') + query;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const sentToken = authToken;
  if (sentToken) {
    headers['Authorization'] = `Bearer ${sentToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let json: any;
    try {
      json = await response.json();
    } catch {
      throw new Error(`Server error (HTTP ${response.status}). Check the API URL and try again.`);
    }

    // Access token rejected: renew it once and repeat the request
    if (response.status === 401 && sentToken && !isAuthEndpoint && !isLogout) {
      if (!isRetry) {
        const result = authToken !== sentToken ? 'ok' : await refreshAuth();
        if (result === 'ok') return await request<T>(endpoint, options, true);
        if (result === 'unavailable') throw new Error('Could not reach the login service. Please try again.');
      }
      setAuthToken(null);
      throw new Error(json.error || 'Your session has expired. Please sign in again.');
    }

    if (!response.ok || json.success === false) {
      const errorMsg = json.error || `HTTP ${response.status} Request failed`;
      throw new Error(errorMsg);
    }

    return json.data !== undefined ? json.data : json;
  } catch (err: any) {
    console.warn(`[API] Error on ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Authentication
  async logout(): Promise<void> {
    await request<unknown>('/auth/logout', { method: 'POST' });
  },

  async login(email: string, password: string): Promise<{ user: AuthUser; session?: AuthSession }> {
    const res = await request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.session?.access_token) {
      setSession(res.session);
    }
    return res;
  },

  async signUp(email: string, password: string): Promise<{ user: AuthUser; session?: AuthSession }> {
    const res = await request<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.session?.access_token) {
      setSession(res.session);
    }
    return res;
  },

  async getMe(): Promise<AuthUser> {
    return request<AuthUser>('/auth/me');
  },

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    return request<DashboardData>('/dashboard');
  },

  // Daily Meter Entries
  async getEntries(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ entries: DailyEntry[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    return request<any>('/entries', { params });
  },

  async getEntryById(id: string): Promise<DailyEntry> {
    return request<DailyEntry>(`/entries/${id}`);
  },

  async createEntry(payload: {
    entry_date: string;
    generated_units: number;
    consumed_units: number;
    buying_rate?: number;
    selling_rate?: number;
    notes?: string;
    opening_import_meter?: number | null;
    closing_import_meter?: number | null;
    opening_export_meter?: number | null;
    closing_export_meter?: number | null;
  }): Promise<DailyEntry> {
    return request<DailyEntry>('/entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateEntry(id: string, payload: Partial<DailyEntry>): Promise<DailyEntry> {
    return request<DailyEntry>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteEntry(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/entries/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkDeleteEntries(ids: string[]): Promise<{ message: string }> {
    return request<{ message: string }>('/entries/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  // Electricity bill cycles
  async getBills(): Promise<BillLedger> {
    return request<BillLedger>('/bills');
  },

  async createBill(bill: { bill_date: string; bill_amount: number }): Promise<BillLedger & { saved: ClosedBill }> {
    return request<BillLedger & { saved: ClosedBill }>('/bills', {
      method: 'POST',
      body: JSON.stringify(bill),
    });
  },

  async deleteBill(id: string): Promise<BillLedger> {
    return request<BillLedger>(`/bills/${id}`, { method: 'DELETE' });
  },

  // Monthly Settlement
  async getSettlement(params?: {
    month?: number;
    year?: number;
    buyingRate?: number;
    sellingRate?: number;
  }): Promise<SettlementReport> {
    return request<SettlementReport>('/settlement', { params });
  },

  // Reports
  async getReports(params?: string | {
    period?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
    financialYear?: string;
    groupBy?: string;
  }): Promise<ReportSummary> {
    const queryParams = typeof params === 'string' ? { period: params } : (params || { period: 'monthly' });
    return request<ReportSummary>('/reports', { params: queryParams });
  },

  async getReportHtml(params?: any): Promise<{ html: string; filename: string }> {
    return request<{ html: string; filename: string }>('/reports/html', { params });
  },

  async getSettlementHtml(params?: any): Promise<{ html: string; filename: string }> {
    return request<{ html: string; filename: string }>('/settlement/html', { params });
  },

  // User Settings
  async getSettings(): Promise<UserSettings> {
    return request<UserSettings>('/settings');
  },

  async updateSettings(payload: Partial<UserSettings>): Promise<UserSettings> {
    return request<UserSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async exportBackup(): Promise<any> {
    return request<any>('/backup/export');
  },

  async importBackup(data: any): Promise<{ message: string }> {
    return request<{ message: string }>('/backup/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
