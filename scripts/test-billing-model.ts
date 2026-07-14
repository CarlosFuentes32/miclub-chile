import assert from "node:assert/strict";
import { createHmac } from "crypto";

type Period = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
type SubscriptionStatus = "DRAFT" | "TRIALING" | "ACTIVE" | "GRACE_PERIOD" | "PAST_DUE" | "SUSPENDED" | "CANCELLED" | "EXPIRED";
type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVERSED";

function nextPeriod(start: Date, period: Period) {
  const next = new Date(start);
  if (period === "YEARLY") next.setFullYear(next.getFullYear() + 1);
  else if (period === "SEMIANNUAL") next.setMonth(next.getMonth() + 6);
  else if (period === "QUARTERLY") next.setMonth(next.getMonth() + 3);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function idempotencyKey(businessId: string, reference: string) {
  return `manual:${businessId}:${reference}`;
}

function signature(secret: string, timestamp: string, body: unknown) {
  return createHmac("sha256", secret).update(`${timestamp}.${JSON.stringify(body)}`).digest("hex");
}

const allowed: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  DRAFT: ["TRIALING", "ACTIVE", "CANCELLED"],
  TRIALING: ["ACTIVE", "EXPIRED", "GRACE_PERIOD", "CANCELLED", "SUSPENDED"],
  ACTIVE: ["GRACE_PERIOD", "PAST_DUE", "SUSPENDED", "CANCELLED"],
  GRACE_PERIOD: ["ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"],
  PAST_DUE: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  CANCELLED: ["ACTIVE"],
  EXPIRED: ["ACTIVE", "CANCELLED"],
};

function canTransition(from: SubscriptionStatus, to: SubscriptionStatus) {
  return from === to || allowed[from].includes(to);
}

function approveManualPayment(payment: { status: PaymentStatus; amount: number; periodStart: Date }, period: Period) {
  assert.equal(payment.status, "PENDING", "solo pagos pendientes pueden aprobarse por este flujo");
  assert.ok(payment.amount > 0, "monto debe ser positivo");
  return {
    payment: { ...payment, status: "APPROVED" as PaymentStatus },
    subscription: {
      status: "ACTIVE" as SubscriptionStatus,
      currentPeriodStartsAt: payment.periodStart,
      nextBillingAt: nextPeriod(payment.periodStart, period),
      lastPaymentStatus: "APPROVED" as PaymentStatus,
    },
  };
}

function discountValue(type: "PERCENTAGE" | "FIXED", value: number, amount: number) {
  assert.ok(value > 0, "descuento debe ser positivo");
  if (type === "PERCENTAGE") assert.ok(value <= 100, "porcentaje no puede superar 100%");
  const discounted = type === "PERCENTAGE" ? amount * (1 - value / 100) : amount - value;
  assert.ok(discounted >= 0, "descuento fijo no puede superar el total");
  return discounted;
}

async function run() {
  const start = new Date("2026-07-10T00:00:00.000Z");
  assert.equal(nextPeriod(start, "MONTHLY").getUTCMonth(), 7, "mensual suma un mes");
  assert.equal(nextPeriod(start, "QUARTERLY").getUTCMonth(), 9, "trimestral suma tres meses");
  assert.equal(nextPeriod(start, "SEMIANNUAL").getUTCMonth(), 0, "semestral suma seis meses");
  assert.equal(nextPeriod(start, "YEARLY").getUTCFullYear(), 2027, "anual suma un año");

  assert.equal(idempotencyKey("b1", "TRX-001"), "manual:b1:TRX-001", "idempotencia manual determinística");
  assert.equal(canTransition("TRIALING", "ACTIVE"), true, "trial puede activarse");
  assert.equal(canTransition("ACTIVE", "SUSPENDED"), true, "activo puede suspenderse");
  assert.equal(canTransition("SUSPENDED", "ACTIVE"), true, "suspendido puede reactivarse");
  assert.equal(canTransition("CANCELLED", "PAST_DUE"), false, "cancelado no entra a mora arbitraria");

  const approved = approveManualPayment({ status: "PENDING", amount: 19990, periodStart: start }, "MONTHLY");
  assert.equal(approved.payment.status, "APPROVED");
  assert.equal(approved.subscription.status, "ACTIVE");
  assert.equal(approved.subscription.nextBillingAt.toISOString(), "2026-08-10T00:00:00.000Z");

  assert.throws(() => approveManualPayment({ status: "APPROVED", amount: 19990, periodStart: start }, "MONTHLY"), /solo pagos pendientes/);
  assert.equal(discountValue("PERCENTAGE", 25, 20000), 15000);
  assert.equal(discountValue("FIXED", 5000, 20000), 15000);
  assert.throws(() => discountValue("PERCENTAGE", 101, 20000), /superar 100/);
  assert.throws(() => discountValue("FIXED", 25000, 20000), /superar el total/);

  const body = { id: "evt_qa_1", type: "payment.approved", payment_id: "pay_1" };
  const timestamp = "1783728000";
  const secret = "local_test_secret";
  const valid = signature(secret, timestamp, body);
  const invalid = signature("otro_secreto", timestamp, body);
  assert.notEqual(valid, invalid, "webhook requiere secreto correcto");

  console.log("OK: billing comercial, estados, pagos manuales, descuentos e idempotencia verificados");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
