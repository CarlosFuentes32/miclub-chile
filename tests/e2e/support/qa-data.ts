import { APIRequestContext, expect } from "@playwright/test";
import { adminApi, loginApi, newApiContext } from "./api";
import { e2e } from "./env";

export function qaRunId(prefix = "qa") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function validRut(run: string) {
  const digits = String(Date.now()).slice(-7);
  return `${digits}-${run.length % 10}`;
}

export async function createQaBusiness(run = qaRunId("business")) {
  const admin = await adminApi();
  const plans = await (await admin.get("/admin/plans")).json();
  expect(plans.length, "debe existir al menos un plan en staging").toBeGreaterThan(0);
  const payload = {
    name: `QA Comercio ${run}`,
    businessType: "Cafetería QA",
    rutBusiness: validRut(run),
    address: "Av. QA 123",
    phone: "+56912345678",
    email: `${run}.business@qa.miclubchile.cl`,
    planId: plans[0].id,
    ownerName: `QA Owner ${run}`,
    ownerEmail: `${run}.owner@qa.miclubchile.cl`,
    ownerPhone: "+56912345679",
    ownerPassword: e2e.defaultPassword,
    region: "Metropolitana",
    commune: "Santiago",
  };
  const response = await admin.post("/admin/businesses", { data: payload });
  expect(response.ok(), await response.text()).toBeTruthy();
  const created = await response.json();
  await admin.dispose();
  return {
    run,
    business: created.business,
    owner: created.owner,
    ownerEmail: payload.ownerEmail,
    ownerPassword: payload.ownerPassword,
    rutBusiness: payload.rutBusiness,
  };
}

export async function createCustomer(run: string, businessSlug?: string) {
  const api = await newApiContext();
  const phone = `+569${String(Date.now()).slice(-8)}`;
  const payload = {
    name: `QA Cliente ${run}`,
    email: `${run}.customer@qa.miclubchile.cl`,
    phone,
    password: e2e.defaultPassword,
    rut: validRut(`${run}-customer`),
    businessSlug,
  };
  const response = await api.post("/auth/register", { data: payload });
  expect(response.ok(), await response.text()).toBeTruthy();
  await api.dispose();
  return payload;
}

export async function createProgram(ownerEmail: string, businessId: string, type: "points" | "stamps" | "cashback", target = 2) {
  const owner = await loginApi(ownerEmail, e2e.defaultPassword);
  const api = await newApiContext(owner.token);
  const accumulation = type === "points" ? "points" : type === "cashback" ? "amount_spent" : "purchase_count";
  const response = await api.post("/business/loyalty-programs", {
    data: {
      business_id: businessId,
      name: `QA ${type}`,
      accumulation_type: accumulation,
      target_value: target,
      reward_description: `QA recompensa ${type}`,
      reward_expiration_days: 30,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const program = await response.json();
  await api.dispose();
  return program;
}

export async function createCashier(ownerEmail: string, businessId: string, run: string) {
  const owner = await loginApi(ownerEmail, e2e.defaultPassword);
  const api = await newApiContext(owner.token);
  const response = await api.post(`/business/collaborators?business_id=${businessId}`, {
    data: {
      name: `QA Cajero ${run}`,
      email: `${run}.cashier@qa.miclubchile.cl`,
      role: "CASHIER",
      password: e2e.defaultPassword,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const cashier = await response.json();
  await api.dispose();
  return cashier;
}
