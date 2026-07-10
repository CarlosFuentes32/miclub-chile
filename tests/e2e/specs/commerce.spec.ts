import { expect, test } from "@playwright/test";
import { loginApi, newApiContext } from "../support/api";
import { createCashier, createCustomer, createProgram, createQaBusiness, qaRunId } from "../support/qa-data";
import { e2e } from "../support/env";
import { loginUi } from "../support/ui";

test.describe("Comercio", () => {
  test("login comercio por UI", async ({ page }) => {
    const qa = await createQaBusiness(qaRunId("commerce-login"));
    await loginUi(page, e2e.commerceUrl, qa.ownerEmail, qa.ownerPassword);
    await expect(page.getByText(/dashboard|programa|recompensas/i).first()).toBeVisible();
  });

  test("crear programas de puntos, sellos y cashback y confirmar activo", async () => {
    const qa = await createQaBusiness(qaRunId("commerce-programs"));
    const points = await createProgram(qa.ownerEmail, qa.business.id, "points", 5);
    const stamps = await createProgram(qa.ownerEmail, qa.business.id, "stamps", 3);
    const cashback = await createProgram(qa.ownerEmail, qa.business.id, "cashback", 1000);

    const owner = await loginApi(qa.ownerEmail, qa.ownerPassword);
    const api = await newApiContext(owner.token);
    const active = await (await api.get(`/business/loyalty-programs/active?business_id=${qa.business.id}`)).json();
    expect(active.id).toBe(cashback.id);
    expect(points.status).toBe("ACTIVE");
    expect(stamps.status).toBe("ACTIVE");
    expect(cashback.status).toBe("ACTIVE");
    await api.dispose();
  });

  test("crear recompensa manual y verla disponible", async () => {
    const qa = await createQaBusiness(qaRunId("commerce-reward"));
    await createProgram(qa.ownerEmail, qa.business.id, "stamps", 2);
    const customer = await createCustomer(qa.run, qa.business.slug);
    const owner = await loginApi(qa.ownerEmail, qa.ownerPassword);
    const customerSession = await loginApi(customer.phone, e2e.defaultPassword);
    const api = await newApiContext(owner.token);
    const created = await api.post("/business/rewards", {
      data: {
        business_id: qa.business.id,
        customer_user_id: customerSession.user.id,
        reward_description: "QA recompensa disponible",
        expires_at: "2027-12-31",
      },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    const rewards = await (await api.get(`/business/rewards?business_id=${qa.business.id}&status=available`)).json();
    expect(rewards.some((reward: any) => reward.rewardDescription === "QA recompensa disponible")).toBeTruthy();
    await api.dispose();
  });

  test("crear colaborador cajero", async () => {
    const qa = await createQaBusiness(qaRunId("commerce-cashier"));
    const cashier = await createCashier(qa.ownerEmail, qa.business.id, qa.run);
    expect(cashier.role).toBe("CASHIER");
    const session = await loginApi(`${qa.run}.cashier@qa.miclubchile.cl`, e2e.defaultPassword);
    expect(session.user.role).toBe("CASHIER");
  });
});
