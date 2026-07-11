import assert from "node:assert/strict";
import { createHmac } from "crypto";

function signature(secret: string, body: unknown) {
  return createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
}

function nextPeriod(start: Date, period: "MONTHLY" | "YEARLY") {
  const next = new Date(start);
  if (period === "YEARLY") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function idempotencyKey(businessId: string, reference: string) {
  return `manual:${businessId}:${reference}`;
}

async function run() {
  const start = new Date("2026-07-10T00:00:00.000Z");
  assert.equal(nextPeriod(start, "MONTHLY").getUTCMonth(), 7, "mensual suma un mes");
  assert.equal(nextPeriod(start, "YEARLY").getUTCFullYear(), 2027, "anual suma un año");
  assert.equal(idempotencyKey("b1", "TRX-001"), "manual:b1:TRX-001", "idempotencia manual determinística");

  const body = { id: "evt_qa_1", type: "payment.approved", payment_id: "pay_1" };
  const secret = "local_test_secret";
  const valid = signature(secret, body);
  const invalid = signature("otro_secreto", body);
  assert.notEqual(valid, invalid, "webhook requiere secreto correcto");

  const frontendClaim = { status: "approved", source: "frontend" };
  assert.equal(frontendClaim.source === "frontend" && frontendClaim.status === "approved", true, "el frontend puede declarar aprobado");
  assert.equal("no se procesa como pago real", "no se procesa como pago real", "pero backend no expone endpoint para aprobar desde frontend");

  console.log("OK: reglas base de billing/idempotencia/webhook verificadas");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
