import { expect, test } from "@playwright/test";
import { adminApi, loginApi, newApiContext } from "../support/api";
import { createCashier, createCustomer, createQaBusiness, qaRunId } from "../support/qa-data";
import { e2e } from "../support/env";

test.describe("Seguridad y autorización", () => {
  test("rutas protegidas sin token y roles cruzados", async () => {
    const qa = await createQaBusiness(qaRunId("security-roles"));
    const customer = await createCustomer(qa.run, qa.business.slug);
    await createCashier(qa.ownerEmail, qa.business.id, qa.run);

    const publicApi = await newApiContext();
    expect((await publicApi.get("/admin/dashboard")).status()).toBe(401);

    const customerSession = await loginApi(customer.phone, e2e.defaultPassword);
    const customerApi = await newApiContext(customerSession.token);
    expect((await customerApi.get("/admin/dashboard")).status()).toBe(403);

    const cashierSession = await loginApi(`${qa.run}.cashier@qa.miclubchile.cl`, e2e.defaultPassword);
    const cashierApi = await newApiContext(cashierSession.token);
    expect((await cashierApi.get(`/business/dashboard?business_id=${qa.business.id}`)).status()).toBe(403);

    const ownerSession = await loginApi(qa.ownerEmail, qa.ownerPassword);
    const ownerApi = await newApiContext(ownerSession.token);
    expect((await ownerApi.get("/admin/dashboard")).status()).toBe(403);

    await publicApi.dispose();
    await customerApi.dispose();
    await cashierApi.dispose();
    await ownerApi.dispose();
  });

  test("usuario suspendido, eliminado y reactivado", async () => {
    const qa = await createQaBusiness(qaRunId("security-status"));
    const admin = await adminApi();
    const owner = await loginApi(qa.ownerEmail, qa.ownerPassword);

    await admin.patch(`/admin/users/${owner.user.id}/status`, { data: { status: "suspended" } });
    const suspended = await newApiContext();
    expect((await suspended.post("/auth/login", { data: { email: qa.ownerEmail, password: qa.ownerPassword } })).status()).toBe(401);

    await admin.post(`/admin/users/${owner.user.id}/reactivate`);
    const activeAgain = await loginApi(qa.ownerEmail, qa.ownerPassword);
    expect(activeAgain.user.status).toBe("ACTIVE");

    await admin.delete(`/admin/users/${owner.user.id}`);
    expect((await suspended.post("/auth/login", { data: { email: qa.ownerEmail, password: qa.ownerPassword } })).status()).toBe(401);
    await admin.post(`/admin/users/${owner.user.id}/reactivate`);
    const reactivated = await loginApi(qa.ownerEmail, qa.ownerPassword);
    expect(reactivated.user.status).toBe("ACTIVE");

    await admin.dispose();
    await suspended.dispose();
  });

  test("token inválido o vencido es rechazado", async () => {
    const api = await newApiContext("token.invalido.expirado");
    const response = await api.get("/customer/home");
    expect([401, 403]).toContain(response.status());
    await api.dispose();
  });
});
