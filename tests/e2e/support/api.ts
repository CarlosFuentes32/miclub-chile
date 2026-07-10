import { APIRequestContext, expect, request } from "@playwright/test";
import { e2e } from "./env";

export interface Session {
  token: string;
  user: any;
}

export async function newApiContext(token?: string) {
  return request.newContext({
    baseURL: e2e.apiUrl,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function loginApi(email: string, password: string): Promise<Session> {
  const api = await newApiContext();
  const response = await api.post("/auth/login", { data: { email, password } });
  expect(response.ok(), `login API para ${email}`).toBeTruthy();
  const body = await response.json();
  await api.dispose();
  return { token: body.accessToken, user: body.user };
}

export async function adminApi() {
  const session = await loginApi(e2e.adminEmail, e2e.adminPassword);
  return newApiContext(session.token);
}

export async function expectStatus(api: APIRequestContext, method: "get" | "post" | "patch" | "delete", path: string, status: number, data?: unknown) {
  const response = await api[method](path, data === undefined ? undefined : { data });
  expect(response.status(), `${method.toUpperCase()} ${path}`).toBe(status);
  return response;
}
