import { APIRequestContext, expect, request } from "@playwright/test";
import { e2e } from "./env";

export interface Session {
  token: string;
  user: any;
}

export async function newApiContext(token?: string) {
  const context = await request.newContext({
    baseURL: `${e2e.apiUrl.replace(/\/$/, "")}/`,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const normalizePath = (path: string) => path.replace(/^\//, "");
  return new Proxy(context, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (["get", "post", "patch", "delete"].includes(String(prop))) {
        return (path: string, options?: unknown) =>
          (value as (path: string, options?: unknown) => Promise<unknown>).call(
            target,
            normalizePath(path),
            options,
          );
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as APIRequestContext;
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
