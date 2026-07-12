import { getApiUrl } from "./runtime-env";

export type UserRole =
  | "CUSTOMER"
  | "CASHIER"
  | "BUSINESS_ADMIN"
  | "BUSINESS_OWNER"
  | "MICLUB_ADMIN"
  | "SUPER_ADMIN";
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate?: string;
  rut?: string;
  role: UserRole;
  status: string;
  forcePasswordChange?: boolean;
  lockedAt?: string | null;
}

const API_URL = getApiUrl();
let accessToken: string | null = null;
let correlationId: string | null = null;

function safeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && response.url.includes("/auth/login"))
    return data.message ?? "Correo o contraseña incorrecta.";
  if (response.status === 401)
    return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (response.status === 403)
    return data.message ?? "No tienes permiso para realizar esta acción.";
  return Array.isArray(data.message)
    ? data.message.join(", ")
    : (data.message ?? "Error de conexión con MiClub");
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": safeId(),
      "X-Correlation-ID": correlationId ?? (correlationId = safeId()),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (refreshed.ok) {
      const session = await refreshed.json();
      accessToken = session.accessToken;
      return apiRequest<T>(path, init, false);
    }
    accessToken = null;
  }
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function login(email: string, password: string) {
  const result = await apiRequest<{ accessToken: string; user: AuthUser }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  accessToken = result.accessToken;
  return result.user;
}
export async function restoreSession() {
  const result = await apiRequest<{ accessToken: string; user: AuthUser }>(
    "/auth/refresh",
    { method: "POST" },
    false,
  );
  accessToken = result.accessToken;
  return result.user;
}
export async function getMe() {
  return apiRequest<AuthUser>("/auth/me");
}
export async function logout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } finally {
    accessToken = null;
  }
}
export async function changeOwnPassword(password: string) {
  await apiRequest("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
  accessToken = null;
}

const customerUrl =
  import.meta.env.VITE_CUSTOMER_URL ??
  (import.meta.env.PROD
    ? "https://app.miclubchile.cl"
    : "http://localhost:5173");
const commerceUrl =
  import.meta.env.VITE_COMMERCE_URL ??
  (import.meta.env.PROD
    ? "https://comercio.miclubchile.cl"
    : "http://localhost:5174");
const cashierUrl =
  import.meta.env.VITE_CASHIER_URL ??
  (import.meta.env.PROD
    ? "https://cajero.miclubchile.cl"
    : "http://localhost:5175");
const adminUrl =
  import.meta.env.VITE_ADMIN_URL ??
  (import.meta.env.PROD
    ? "https://admin.miclubchile.cl"
    : "http://localhost:5176");
export const portalByRole: Record<UserRole, string> = {
  CUSTOMER: customerUrl,
  BUSINESS_ADMIN: commerceUrl,
  BUSINESS_OWNER: commerceUrl,
  CASHIER: cashierUrl,
  MICLUB_ADMIN: adminUrl,
  SUPER_ADMIN: adminUrl,
};
