export type UserRole = 'CUSTOMER' | 'CASHIER' | 'BUSINESS_ADMIN' | 'BUSINESS_OWNER' | 'MICLUB_ADMIN';
export interface AuthUser { id: string; name: string; email: string; phone: string; role: UserRole; status: string; }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
let accessToken: string | null = null;

async function parseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (response.status === 403) return data.message ?? 'No tienes permiso para realizar esta acción.';
  return Array.isArray(data.message) ? data.message.join(', ') : data.message ?? 'Error de conexión con MiClub';
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers } });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
    if (refreshed.ok) { const session = await refreshed.json(); accessToken = session.accessToken; return apiRequest<T>(path, init, false); }
    accessToken = null;
  }
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.status === 204 ? undefined as T : response.json();
}

export async function login(email: string, password: string) {
  const result = await apiRequest<{ accessToken: string; user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  accessToken = result.accessToken;
  return result.user;
}
export async function restoreSession() {
  const result = await apiRequest<{ accessToken: string; user: AuthUser }>('/auth/refresh', { method: 'POST' }, false);
  accessToken = result.accessToken;
  return result.user;
}
export async function getMe() { return apiRequest<AuthUser>('/auth/me'); }
export async function logout() { try { await apiRequest('/auth/logout', { method: 'POST' }); } finally { accessToken = null; } }

export const portalByRole: Record<UserRole, string> = { CUSTOMER: 'http://localhost:5173', BUSINESS_ADMIN: 'http://localhost:5174', BUSINESS_OWNER: 'http://localhost:5174', CASHIER: 'http://localhost:5175', MICLUB_ADMIN: 'http://localhost:5176' };
