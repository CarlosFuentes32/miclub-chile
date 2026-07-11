import { expect, test } from "@playwright/test";
import { createHmac } from "crypto";
import { adminApi } from "../support/api";
import { cleanupQaArtifacts, createQaBusiness, qaRunId } from "../support/qa-data";
import { e2e } from "../support/env";

test.describe("Billing staging", () => {
  test.afterEach(async () => {
    await cleanupQaArtifacts();
  });

  test("crea suscripción al crear comercio, permite pago manual idempotente y reactiva", async () => {
    const qa = await createQaBusiness(qaRunId("billing"));
    const admin = await adminApi();

    const subscriptions = await admin.get("/admin/billing/subscriptions");
    expect(subscriptions.ok(), await subscriptions.text()).toBeTruthy();
    const rows = await subscriptions.json();
    const subscription = rows.find((row: any) => row.businessId === qa.business.id);
    expect(subscription, "el comercio QA debe tener suscripción").toBeTruthy();
    expect(["TRIALING", "ACTIVE"]).toContain(subscription.status);
    expect(subscription.plan.id).toBe(qa.business.planId);

    const suspend = await admin.post(`/admin/billing/subscriptions/${qa.business.id}/suspend`, {
      data: { reason: "QA suspensión billing" },
    });
    expect(suspend.ok(), await suspend.text()).toBeTruthy();

    const reference = `QA-TRANSFER-${qa.run}`;
    const manualPayload = {
      businessId: qa.business.id,
      planId: qa.business.planId,
      amount: 1000,
      paymentMethod: "transferencia_qa",
      reference,
      reason: "QA pago manual trazable",
    };
    const first = await admin.post("/admin/billing/payments/manual", { data: manualPayload });
    expect(first.ok(), await first.text()).toBeTruthy();
    const firstBody = await first.json();
    expect(firstBody.status).toBe("APPROVED");
    expect(firstBody.provider).toBe("MANUAL");

    const second = await admin.post("/admin/billing/payments/manual", { data: manualPayload });
    expect(second.ok(), await second.text()).toBeTruthy();
    const secondBody = await second.json();
    expect(secondBody.id).toBe(firstBody.id);

    const refreshed = await (await admin.get("/admin/billing/subscriptions")).json();
    const active = refreshed.find((row: any) => row.businessId === qa.business.id);
    expect(active.status).toBe("ACTIVE");
    expect(active.lastPaymentStatus).toBe("APPROVED");

    await admin.dispose();
  });

  test("acepta webhook firmado solo una vez por id de evento", async () => {
    const admin = await adminApi();
    const payload = {
      id: `qa-webhook-${Date.now()}`,
      type: "payment.updated",
      status: "approved",
      source: "playwright-staging",
    };
    const signature = createHmac("sha256", e2e.billingWebhookSecret).update(JSON.stringify(payload)).digest("hex");

    const first = await admin.post("/billing/webhooks/flow", {
      data: payload,
      headers: { "x-miclub-signature": signature },
    });
    expect(first.ok(), await first.text()).toBeTruthy();
    const firstBody = await first.json();
    expect(firstBody.accepted).toBeTruthy();
    expect(firstBody.status).toBe("RECEIVED");

    const second = await admin.post("/billing/webhooks/flow", {
      data: payload,
      headers: { "x-miclub-signature": signature },
    });
    expect(second.ok(), await second.text()).toBeTruthy();
    const secondBody = await second.json();
    expect(secondBody.idempotent).toBeTruthy();

    await admin.dispose();
  });
});
