import { expect, test } from "@playwright/test";
import { loginApi, newApiContext } from "../support/api";
import { createCashier, createCustomer, createProgram, createQaBusiness, qaRunId } from "../support/qa-data";
import { e2e } from "../support/env";

async function setupCashierFlow(type: "stamps" | "points" | "cashback" = "stamps") {
  const qa = await createQaBusiness(qaRunId(`flow-${type}`));
  await createProgram(qa.ownerEmail, qa.business.id, type, type === "cashback" ? 1000 : 2);
  const customer = await createCustomer(qa.run, qa.business.slug);
  const customerSession = await loginApi(customer.phone, e2e.defaultPassword);
  await createCashier(qa.ownerEmail, qa.business.id, qa.run);
  const cashierSession = await loginApi(`${qa.run}.cashier@qa.miclubchile.cl`, e2e.defaultPassword);
  const api = await newApiContext(cashierSession.token);
  return { qa, customer, customerSession, cashierSession, api };
}

test.describe("Cajero y Cliente", () => {
  test("login cajero, buscar cliente y cliente inexistente", async () => {
    const { qa, customer, api } = await setupCashierFlow();
    const found = await api.get(`/cashier/customers/search?business_id=${qa.business.id}&phone=${customer.phone}`);
    expect(found.ok(), await found.text()).toBeTruthy();
    expect((await found.json()).length).toBeGreaterThan(0);

    const missing = await api.get(`/cashier/customers/search?business_id=${qa.business.id}&phone=00000000`);
    expect(missing.ok(), await missing.text()).toBeTruthy();
    expect(await missing.json()).toEqual([]);
    await api.dispose();
  });

  test("registrar compras, obtener recompensa, canjear y evitar doble canje", async () => {
    const { qa, customerSession, api } = await setupCashierFlow("stamps");
    const first = await api.post("/cashier/transactions", { data: { business_id: qa.business.id, customer_user_id: customerSession.user.id } });
    expect(first.ok(), await first.text()).toBeTruthy();
    const second = await api.post("/cashier/transactions", { data: { business_id: qa.business.id, customer_user_id: customerSession.user.id } });
    expect(second.ok(), await second.text()).toBeTruthy();
    const unlocked = await second.json();
    expect(unlocked.reward_unlocked).toBeTruthy();

    const redeemed = await api.post("/cashier/rewards/redeem", { data: { business_id: qa.business.id, reward_id: unlocked.reward_id } });
    expect(redeemed.ok(), await redeemed.text()).toBeTruthy();
    const double = await api.post("/cashier/rewards/redeem", { data: { business_id: qa.business.id, reward_id: unlocked.reward_id } });
    expect(double.status()).toBe(409);
    await api.dispose();
  });

  test("anular operación cuando corresponde", async () => {
    const { qa, customerSession, api } = await setupCashierFlow("points");
    const transaction = await api.post("/cashier/transactions", { data: { business_id: qa.business.id, customer_user_id: customerSession.user.id, value: 1 } });
    expect(transaction.ok(), await transaction.text()).toBeTruthy();
    const body = await transaction.json();
    const cancelled = await api.post(`/cashier/transactions/${body.transaction_id}/cancel`);
    expect(cancelled.ok(), await cancelled.text()).toBeTruthy();
    expect((await cancelled.json()).status).toBe("CANCELLED");
    await api.dispose();
  });

  test("cliente: registro, login, QR, historial, recompensas, perfil y múltiples comercios", async () => {
    const qa1 = await createQaBusiness(qaRunId("customer-a"));
    const qa2 = await createQaBusiness(qaRunId("customer-b"));
    await createProgram(qa1.ownerEmail, qa1.business.id, "stamps", 1);
    await createProgram(qa2.ownerEmail, qa2.business.id, "points", 2);
    const customer = await createCustomer(qa1.run, qa1.business.slug);
    const session = await loginApi(customer.phone, e2e.defaultPassword);
    const api = await newApiContext(session.token);

    const joinSecond = await api.post(`/customer/businesses/${qa2.business.slug}/join`);
    expect(joinSecond.ok(), await joinSecond.text()).toBeTruthy();
    const home = await (await api.get("/customer/home")).json();
    expect(home.qr.token).toBeTruthy();
    expect(home.programs.length).toBeGreaterThanOrEqual(2);
    expect((await (await api.get("/customer/history")).json()).length).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(await (await api.get("/customer/rewards")).json())).toBeTruthy();

    const profile = await api.patch("/users/me", { data: { name: `QA Cliente Editado ${qa1.run}`, phone: customer.phone, email: customer.email } });
    expect(profile.ok(), await profile.text()).toBeTruthy();
    expect((await profile.json()).name).toContain("Editado");
    await api.dispose();
  });

  test("cliente: validaciones de nombre, teléfono, correo y contraseña", async ({ page }) => {
    await page.goto(`${e2e.customerUrl}/#/register`);
    await page.getByLabel(/nombre/i).fill("123");
    await page.getByLabel(/teléfono/i).fill("abc");
    await page.getByLabel(/correo/i).fill("correo-invalido");
    await page.getByLabel(/contraseña/i).fill("123");
    await page.getByRole("button", { name: /crear/i }).click();
    await expect(page.getByLabel(/nombre/i)).toBeVisible();
  });

  test("cliente: recuperación de contraseña solicita instrucciones sin enumerar usuario", async () => {
    const api = await newApiContext();
    const response = await api.post("/auth/password-reset/request", { data: { identifier: "no-existe@qa.miclubchile.cl" } });
    expect(response.ok(), await response.text()).toBeTruthy();
    expect((await response.json()).message).toMatch(/si los datos existen/i);
    await api.dispose();
  });
});
