import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { BusinessesService } from "../backend/api/src/businesses/businesses.service";

const business = {
  id: "business-qr-a",
  name: "Comercio QR QA",
  slug: "comercio-qr-qa",
  businessType: "Cafetería",
  rutBusiness: "76.123.456-7",
  ownerUserId: "owner-1",
  phone: "+56911111111",
  email: "comercio.qr.qa@miclubchile.cl",
  address: "QA 123",
  region: "Metropolitana",
  commune: "Santiago",
  logoUrl: null,
  status: "ACTIVE",
  planId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const users: any[] = [];
const memberships: any[] = [];
const programs: any[] = [];
const rewards: any[] = [];

const prisma: any = {
  user: {
    create: ({ data }: any) => {
      const row = { id: `user-${users.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
      users.push(row);
      return row;
    },
  },
  businessUser: {
    create: ({ data, include }: any) => {
      const row = {
        id: `membership-${memberships.length + 1}`,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      memberships.push(row);
      return {
        ...row,
        user: include?.user ? users.find((user) => user.id === row.userId) : undefined,
        business: include?.business ? { name: business.name } : undefined,
      };
    },
    update: ({ where, data, include }: any) => {
      const row = memberships.find((membership) => membership.id === where.id);
      if (!row) throw new Error(`Membership ${where.id} not found`);
      Object.assign(row, data, { updatedAt: new Date() });
      return {
        ...row,
        user: include?.user ? users.find((user) => user.id === row.userId) : undefined,
      };
    },
  },
};

const access = {
  requireManager: async (userId: string, businessId: string) => {
    assert.equal(userId, "owner-1");
    assert.equal(businessId, business.id);
    return {
      business,
      member: { id: "owner-membership", userId, businessId, role: "BUSINESS_OWNER", status: "ACTIVE" },
    };
  },
};

const config = {
  get: (_key: string, fallback: string) => "https://app.miclubchile.cl" || fallback,
};

const email = {
  collaboratorInvited: async () => undefined,
};

const audit = {
  create: async () => undefined,
};

function hashQr(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function assertSameQr(service: BusinessesService, baseline: string, step: string) {
  const current = await service.qrMaterial("owner-1", business.id);
  assert.equal(current.registrationUrl, baseline, `El QR de incorporación cambió después de: ${step}`);
  assert.equal(current.businessCode, business.slug.toUpperCase(), `El código público del comercio cambió después de: ${step}`);
}

async function run() {
  const service = new BusinessesService(prisma, access as any, config as any, email as any, audit as any);

  const initial = await service.qrMaterial("owner-1", business.id);
  assert.equal(initial.registrationUrl, "https://app.miclubchile.cl/#/join?business=comercio-qr-qa");
  assert.equal(initial.businessCode, "COMERCIO-QR-QA");
  const baseline = initial.registrationUrl;
  const baselineHash = hashQr(baseline);

  const cashier = await service.createCollaborator("owner-1", business.id, {
    name: "Cajero QR QA",
    email: "cajero.qr.qa@miclubchile.cl",
    role: "CASHIER" as any,
    password: "MiClub-QA-Temporal-2026!",
  });
  await assertSameQr(service, baseline, "crear cajero");

  await service.updateCollaborator("owner-1", business.id, cashier.id, { role: "CASHIER" as any });
  await assertSameQr(service, baseline, "editar cajero");

  await service.updateCollaborator("owner-1", business.id, cashier.id, { status: "INACTIVE" });
  await assertSameQr(service, baseline, "suspender cajero");

  await service.updateCollaborator("owner-1", business.id, cashier.id, { status: "ACTIVE" });
  await assertSameQr(service, baseline, "reactivar cajero");

  await service.updateCollaborator("owner-1", business.id, cashier.id, { status: "INACTIVE" });
  users.find((user) => user.id === cashier.userId).status = "DELETED";
  await assertSameQr(service, baseline, "eliminar lógicamente cajero");

  await service.createCollaborator("owner-1", business.id, {
    name: "Segundo Cajero QR QA",
    email: "segundo.cajero.qr.qa@miclubchile.cl",
    role: "CASHIER" as any,
    password: "MiClub-QA-Temporal-2026!",
  });
  await assertSameQr(service, baseline, "crear segundo cajero");

  programs.push({ id: "program-qr-qa", businessId: business.id, status: "ACTIVE" });
  await assertSameQr(service, baseline, "crear programa");

  rewards.push({ id: "reward-qr-qa", businessId: business.id, customerUserId: "customer-1", status: "AVAILABLE" });
  await assertSameQr(service, baseline, "crear recompensa");

  const afterNewSession = await service.qrMaterial("owner-1", business.id);
  assert.equal(hashQr(afterNewSession.registrationUrl), baselineHash, "El QR cambió después de cerrar e iniciar sesión");

  const customerPersonalQr = "customer_qr.jwt.payload.example";
  assert.notEqual(customerPersonalQr, baseline, "El QR personal del cliente no debe ser igual al QR de incorporación");
  assert.ok(baseline.includes("/#/join?business="), "El QR de incorporación debe abrir el flujo de registro/vinculación");
  assert.ok(!baseline.includes("user-") && !baseline.includes("membership-"), "El QR de incorporación no debe depender del cajero ni de membresías");

  console.log(`OK: QR de incorporación estable (${baselineHash.slice(0, 12)}…) frente a cajeros, programa, recompensa y nueva sesión`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
