import {
  AccumulationType,
  CycleStatus,
  MembershipStatus,
  PrismaClient,
  ProgramStatus,
  RewardStatus,
  TransactionStatus,
  TransactionType,
  UserRole,
  UserStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();
const value = (key: string, fallback: string) => process.env[key] ?? fallback;

function assertStagingDatabase() {
  const nodeEnv = process.env.NODE_ENV;
  const confirmation = process.env.STAGING_DATABASE_CONFIRM;
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (nodeEnv !== "staging") {
    throw new Error("Seed staging bloqueado: NODE_ENV debe ser staging.");
  }
  if (confirmation !== "miclub-staging") {
    throw new Error(
      "Seed staging bloqueado: define STAGING_DATABASE_CONFIRM=miclub-staging.",
    );
  }
  if (!databaseUrl) {
    throw new Error("Seed staging bloqueado: DATABASE_URL no está definido.");
  }
  if (/api\.miclubchile\.cl|miclub[_-]?prod|production|prod/i.test(databaseUrl)) {
    throw new Error(
      "Seed staging bloqueado: DATABASE_URL parece apuntar a producción.",
    );
  }
}

async function upsertUser(data: {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      phone: data.phone,
      role: data.role,
      passwordHash: data.passwordHash,
      status: UserStatus.ACTIVE,
      forcePasswordChange: false,
      deletedAt: null,
      deletedByUserId: null,
      failedLoginAttempts: 0,
      lockedAt: null,
    },
    create: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      passwordHash: data.passwordHash,
      status: UserStatus.ACTIVE,
      forcePasswordChange: false,
    },
  });
}

async function main() {
  assertStagingDatabase();

  const qaPassword = process.env.QA_SEED_PASSWORD;
  if (!qaPassword || qaPassword.length < 12) {
    throw new Error(
      "Seed staging bloqueado: QA_SEED_PASSWORD debe definirse manualmente y tener al menos 12 caracteres.",
    );
  }
  const passwordHash = await bcrypt.hash(qaPassword, 12);

  const qaAdmin = await upsertUser({
    name: "QA Super Administrador",
    email: value("QA_ADMIN_EMAIL", "qa.admin@miclubchile.cl"),
    phone: "+56981000001",
    role: UserRole.SUPER_ADMIN,
    passwordHash,
  });
  const owner = await upsertUser({
    name: "QA Comercio",
    email: value("QA_OWNER_EMAIL", "qa.comercio@miclubchile.cl"),
    phone: "+56981000002",
    role: UserRole.BUSINESS_OWNER,
    passwordHash,
  });
  const cashier = await upsertUser({
    name: "QA Cajero",
    email: value("QA_CASHIER_EMAIL", "qa.cajero@miclubchile.cl"),
    phone: "+56981000003",
    role: UserRole.CASHIER,
    passwordHash,
  });
  const customer1 = await upsertUser({
    name: "QA Cliente Uno",
    email: value("QA_CUSTOMER_1_EMAIL", "qa.cliente1@miclubchile.cl"),
    phone: "+56981000004",
    role: UserRole.CUSTOMER,
    passwordHash,
  });
  const customer2 = await upsertUser({
    name: "QA Cliente Dos",
    email: value("QA_CUSTOMER_2_EMAIL", "qa.cliente2@miclubchile.cl"),
    phone: "+56981000005",
    role: UserRole.CUSTOMER,
    passwordHash,
  });

  const plan = await prisma.plan.upsert({
    where: { name: "MiClub QA Staging" },
    update: {
      monthlyPrice: 0,
      customerLimit: 1000,
      collaboratorLimit: 20,
      features: ["Datos ficticios", "Ambiente aislado", "Pruebas E2E"],
      active: true,
    },
    create: {
      name: "MiClub QA Staging",
      monthlyPrice: 0,
      customerLimit: 1000,
      collaboratorLimit: 20,
      features: ["Datos ficticios", "Ambiente aislado", "Pruebas E2E"],
      active: true,
    },
  });

  const business = await prisma.business.upsert({
    where: { slug: value("QA_BUSINESS_SLUG", "qa-comercio-staging") },
    update: {
      name: "QA Comercio Staging",
      businessType: "cafeteria",
      ownerUserId: owner.id,
      phone: "+56981000010",
      email: "qa.comercio.staging@miclubchile.cl",
      address: "Av. QA 123, Santiago",
      region: "Metropolitana",
      commune: "Santiago",
      status: "ACTIVE",
      planId: plan.id,
    },
    create: {
      name: "QA Comercio Staging",
      slug: value("QA_BUSINESS_SLUG", "qa-comercio-staging"),
      businessType: "cafeteria",
      rutBusiness: "76543210K",
      ownerUserId: owner.id,
      phone: "+56981000010",
      email: "qa.comercio.staging@miclubchile.cl",
      address: "Av. QA 123, Santiago",
      region: "Metropolitana",
      commune: "Santiago",
      status: "ACTIVE",
      planId: plan.id,
    },
  });

  for (const member of [
    { userId: owner.id, role: UserRole.BUSINESS_OWNER },
    { userId: cashier.id, role: UserRole.CASHIER },
  ]) {
    await prisma.businessUser.upsert({
      where: {
        businessId_userId: { businessId: business.id, userId: member.userId },
      },
      update: { role: member.role, status: MembershipStatus.ACTIVE },
      create: {
        businessId: business.id,
        userId: member.userId,
        role: member.role,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  for (const customer of [customer1, customer2]) {
    await prisma.customerBusiness.upsert({
      where: {
        customerUserId_businessId: {
          customerUserId: customer.id,
          businessId: business.id,
        },
      },
      update: { status: MembershipStatus.ACTIVE },
      create: {
        customerUserId: customer.id,
        businessId: business.id,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  await prisma.loyaltyProgram.upsert({
    where: { businessId_version: { businessId: business.id, version: 1 } },
    update: {
      name: "QA Puntos",
      accumulationType: AccumulationType.POINTS,
      targetValue: 100,
      rewardDescription: "$3.000 de descuento QA",
      rewardExpirationDays: 30,
      status: ProgramStatus.ARCHIVED,
    },
    create: {
      businessId: business.id,
      name: "QA Puntos",
      accumulationType: AccumulationType.POINTS,
      targetValue: 100,
      rewardDescription: "$3.000 de descuento QA",
      rewardExpirationDays: 30,
      version: 1,
      status: ProgramStatus.ARCHIVED,
    },
  });

  await prisma.loyaltyProgram.upsert({
    where: { businessId_version: { businessId: business.id, version: 2 } },
    update: {
      name: "QA Sellos",
      accumulationType: AccumulationType.VISIT_COUNT,
      targetValue: 8,
      rewardDescription: "Café gratis QA",
      rewardExpirationDays: 30,
      status: ProgramStatus.ARCHIVED,
    },
    create: {
      businessId: business.id,
      name: "QA Sellos",
      accumulationType: AccumulationType.VISIT_COUNT,
      targetValue: 8,
      rewardDescription: "Café gratis QA",
      rewardExpirationDays: 30,
      version: 2,
      status: ProgramStatus.ARCHIVED,
    },
  });

  const activeProgram = await prisma.loyaltyProgram.upsert({
    where: { businessId_version: { businessId: business.id, version: 3 } },
    update: {
      name: "QA Cashback",
      accumulationType: AccumulationType.AMOUNT_SPENT,
      targetValue: 15000,
      rewardDescription: "10% cashback QA en próxima compra",
      rewardExpirationDays: 30,
      status: ProgramStatus.ACTIVE,
    },
    create: {
      businessId: business.id,
      name: "QA Cashback",
      accumulationType: AccumulationType.AMOUNT_SPENT,
      targetValue: 15000,
      rewardDescription: "10% cashback QA en próxima compra",
      rewardExpirationDays: 30,
      version: 3,
      status: ProgramStatus.ACTIVE,
    },
  });

  const existingCycle = await prisma.cycle.findFirst({
    where: {
      customerUserId: customer1.id,
      businessId: business.id,
      loyaltyProgramId: activeProgram.id,
      status: CycleStatus.ACTIVE,
    },
  });
  const activeCycle =
    existingCycle ??
    (await prisma.cycle.create({
      data: {
        customerUserId: customer1.id,
        businessId: business.id,
        loyaltyProgramId: activeProgram.id,
        currentValue: 15000,
        targetValue: activeProgram.targetValue,
        status: CycleStatus.ACTIVE,
      },
    }));

  const transaction = await prisma.transaction.findFirst({
    where: {
      customerUserId: customer1.id,
      businessId: business.id,
      performedByUserId: cashier.id,
      transactionType: TransactionType.AMOUNT,
      status: TransactionStatus.VALID,
    },
  });
  if (!transaction) {
    await prisma.transaction.create({
      data: {
        cycleId: activeCycle.id,
        businessId: business.id,
        customerUserId: customer1.id,
        performedByUserId: cashier.id,
        transactionType: TransactionType.AMOUNT,
        previousValue: 0,
        valueAdded: 15000,
        amountOptional: 15000,
        status: TransactionStatus.VALID,
      },
    });
  }

  const reward = await prisma.reward.findFirst({
    where: {
      customerUserId: customer1.id,
      businessId: business.id,
      cycleId: activeCycle.id,
      status: RewardStatus.AVAILABLE,
    },
  });
  if (!reward) {
    await prisma.reward.create({
      data: {
        cycleId: activeCycle.id,
        businessId: business.id,
        customerUserId: customer1.id,
        rewardDescription: activeProgram.rewardDescription,
        status: RewardStatus.AVAILABLE,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: qaAdmin.id,
      businessId: business.id,
      action: "staging_seed_executed",
      entityType: "environment",
      entityId: business.id,
      metadata: {
        environment: "staging",
        qaBusiness: business.slug,
      },
    },
  });

  console.log(
    `Seed staging listo: ${business.name} (${business.slug}). Usuarios QA creados con contraseña QA_SEED_PASSWORD.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
