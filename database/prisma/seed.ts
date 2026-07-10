import {
  AccumulationType,
  CycleStatus,
  MembershipStatus,
  ManualCustomerSegment,
  PrismaClient,
  ProgramStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();
const value = (key: string, fallback: string) => process.env[key] ?? fallback;
const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("Define SEED_PASSWORD con al menos 12 caracteres antes de ejecutar el seed.");
  const passwordHash = await bcrypt.hash(password, 12);
  const businessName = value("PILOT_BUSINESS_NAME", "Minimarket Piloto");
  const businessSlug = value("PILOT_BUSINESS_SLUG", slugify(businessName));
  const adminEmail = "administrador@miclubchile.cl";
  const ownerEmail = value("PILOT_OWNER_EMAIL", "owner@miclub.local");
  const cashierEmail = value("PILOT_CASHIER_EMAIL", "cashier@miclub.local");
  const customerEmail = value("PILOT_CUSTOMER_EMAIL", "customer@miclub.local");
  const users = [
    {
      name: value("PILOT_ADMIN_NAME", "Admin MiClub"),
      email: adminEmail,
      phone: value("PILOT_ADMIN_PHONE", "+56911111111"),
      role: UserRole.SUPER_ADMIN,
    },
    {
      name: value("PILOT_OWNER_NAME", "Dueño Minimarket Piloto"),
      email: ownerEmail,
      phone: value("PILOT_OWNER_PHONE", "+56922222222"),
      role: UserRole.BUSINESS_OWNER,
    },
    {
      name: value("PILOT_CASHIER_NAME", "Cajero Piloto"),
      email: cashierEmail,
      phone: value("PILOT_CASHIER_PHONE", "+56933333333"),
      role: UserRole.CASHIER,
    },
    {
      name: value("PILOT_CUSTOMER_NAME", "Cliente Demo"),
      email: customerEmail,
      phone: value("PILOT_CUSTOMER_PHONE", "+56995026368"),
      role: UserRole.CUSTOMER,
    },
  ];
  for (const user of users)
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash, status: UserStatus.ACTIVE },
      create: { ...user, passwordHash, status: UserStatus.ACTIVE },
    });
  const [owner, cashier, customer] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } }),
    prisma.user.findUniqueOrThrow({ where: { email: cashierEmail } }),
    prisma.user.findUniqueOrThrow({ where: { email: customerEmail } }),
  ]);
  const plans = [
    {
      name: "MiClub Start",
      monthlyPrice: 19990,
      customerLimit: 500,
      collaboratorLimit: 3,
      features: [
        "Programa de fidelización",
        "Panel cajero",
        "QR de inscripción",
      ],
    },
    {
      name: "MiClub Business",
      monthlyPrice: 39990,
      customerLimit: 2500,
      collaboratorLimit: 10,
      features: ["Todo Start", "Reportes básicos", "Más colaboradores"],
    },
    {
      name: "MiClub Enterprise",
      monthlyPrice: 0,
      customerLimit: 100000,
      collaboratorLimit: 100,
      features: [
        "Configuración personalizada",
        "Soporte prioritario",
        "Múltiples sucursales",
      ],
    },
  ];
  for (const plan of plans)
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: { ...plan, active: true },
      create: { ...plan, active: true },
    });
  const startPlan = await prisma.plan.findUniqueOrThrow({
    where: { name: "MiClub Start" },
  });
  const business = await prisma.business.upsert({
    where: { slug: businessSlug },
    update: {
      name: businessName,
      businessType: "minimarket",
      ownerUserId: owner.id,
      planId: startPlan.id,
      status: "ACTIVE",
    },
    create: {
      name: businessName,
      slug: businessSlug,
      businessType: "minimarket",
      rutBusiness: process.env.PILOT_BUSINESS_RUT || null,
      ownerUserId: owner.id,
      phone: value("PILOT_BUSINESS_PHONE", "+56944444444"),
      email: value("PILOT_BUSINESS_EMAIL", "contacto@minimarket-piloto.local"),
      address: value(
        "PILOT_BUSINESS_ADDRESS",
        "Dirección piloto por configurar",
      ),
      planId: startPlan.id,
      status: "ACTIVE",
    },
  });
  for (const member of [
    { userId: owner.id, role: UserRole.BUSINESS_OWNER },
    { userId: cashier.id, role: UserRole.CASHIER },
  ])
    await prisma.businessUser.upsert({
      where: {
        businessId_userId: { businessId: business.id, userId: member.userId },
      },
      update: { role: member.role, status: MembershipStatus.ACTIVE },
      create: {
        businessId: business.id,
        ...member,
        status: MembershipStatus.ACTIVE,
      },
    });
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
  const target = Number(value("PILOT_PROGRAM_TARGET", "10"));
  const reward = value(
    "PILOT_PROGRAM_REWARD",
    "$5.000 de descuento en la próxima compra",
  );
  let program = await prisma.loyaltyProgram.findFirst({
    where: { businessId: business.id, status: ProgramStatus.ACTIVE },
    orderBy: { version: "desc" },
  });
  if (!program)
    program = await prisma.loyaltyProgram.upsert({
      where: { businessId_version: { businessId: business.id, version: 1 } },
      update: {
        name: `${target} compras`,
        accumulationType: AccumulationType.PURCHASE_COUNT,
        targetValue: target,
        rewardDescription: reward,
        rewardExpirationDays: 30,
        status: ProgramStatus.ACTIVE,
      },
      create: {
        businessId: business.id,
        name: `${target} compras`,
        accumulationType: AccumulationType.PURCHASE_COUNT,
        targetValue: target,
        rewardDescription: reward,
        rewardExpirationDays: 30,
        version: 1,
        status: ProgramStatus.ACTIVE,
      },
    });
  const activeCycle = await prisma.cycle.findFirst({
    where: {
      businessId: business.id,
      customerUserId: customer.id,
      status: CycleStatus.ACTIVE,
    },
  });
  if (!activeCycle)
    await prisma.cycle.create({
      data: {
        businessId: business.id,
        customerUserId: customer.id,
        loyaltyProgramId: program.id,
        targetValue: program.targetValue,
      },
    });
  const testPasswordHash = await bcrypt.hash(
    process.env.TEST_ACCOUNT_PASSWORD || password,
    12,
  );
  const testUsers = [
    {
      name: "prueba admin",
      email: "prueba.admin@miclubchile.cl",
      phone: "+56995026364",
      role: UserRole.SUPER_ADMIN,
    },
    {
      name: "prueba comercio",
      email: "prueba.comercio@miclubchile.cl",
      phone: "+56995026365",
      role: UserRole.BUSINESS_OWNER,
    },
    {
      name: "prueba cajero",
      email: "prueba.cajero@miclubchile.cl",
      phone: "+56995026366",
      role: UserRole.CASHIER,
    },
    {
      name: "prueba cliente",
      email: "prueba.cliente@miclubchile.cl",
      phone: "+56995026367",
      role: UserRole.CUSTOMER,
    },
  ];
  for (const user of testUsers)
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        ...user,
        passwordHash: testPasswordHash,
        status: UserStatus.ACTIVE,
      },
      create: {
        ...user,
        passwordHash: testPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });
  const [testOwner, testCashier, testCustomer] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { email: "prueba.comercio@miclubchile.cl" },
    }),
    prisma.user.findUniqueOrThrow({
      where: { email: "prueba.cajero@miclubchile.cl" },
    }),
    prisma.user.findUniqueOrThrow({
      where: { email: "prueba.cliente@miclubchile.cl" },
    }),
  ]);
  const testBusiness = await prisma.business.upsert({
    where: { slug: "comercio-prueba-miclub" },
    update: {
      name: "Comercio Prueba MiClub",
      businessType: "minimarket",
      ownerUserId: testOwner.id,
      planId: startPlan.id,
      status: "ACTIVE",
    },
    create: {
      name: "Comercio Prueba MiClub",
      slug: "comercio-prueba-miclub",
      businessType: "minimarket",
      ownerUserId: testOwner.id,
      phone: "+56995026363",
      email: "comercio.prueba@miclubchile.cl",
      address: "Comercio de prueba",
      planId: startPlan.id,
      status: "ACTIVE",
    },
  });
  for (const member of [
    { userId: testOwner.id, role: UserRole.BUSINESS_OWNER },
    { userId: testCashier.id, role: UserRole.CASHIER },
  ])
    await prisma.businessUser.upsert({
      where: {
        businessId_userId: {
          businessId: testBusiness.id,
          userId: member.userId,
        },
      },
      update: { role: member.role, status: MembershipStatus.ACTIVE },
      create: {
        businessId: testBusiness.id,
        ...member,
        status: MembershipStatus.ACTIVE,
      },
    });
  await prisma.customerBusiness.upsert({
    where: {
      customerUserId_businessId: {
        customerUserId: testCustomer.id,
        businessId: testBusiness.id,
      },
    },
    update: { status: MembershipStatus.ACTIVE },
    create: {
      customerUserId: testCustomer.id,
      businessId: testBusiness.id,
      status: MembershipStatus.ACTIVE,
    },
  });
  let testProgram = await prisma.loyaltyProgram.findFirst({
    where: { businessId: testBusiness.id, status: ProgramStatus.ACTIVE },
    orderBy: { version: "desc" },
  });
  if (!testProgram)
    testProgram = await prisma.loyaltyProgram.create({
      data: {
        businessId: testBusiness.id,
        name: "10 compras",
        accumulationType: AccumulationType.PURCHASE_COUNT,
        targetValue: 10,
        rewardDescription: "$2.000 de descuento en próxima compra",
        rewardExpirationDays: 30,
        version: 1,
        status: ProgramStatus.ACTIVE,
      },
    });
  const testCycle = await prisma.cycle.findFirst({
    where: {
      businessId: testBusiness.id,
      customerUserId: testCustomer.id,
      status: CycleStatus.ACTIVE,
    },
  });
  if (!testCycle)
    await prisma.cycle.create({
      data: {
        businessId: testBusiness.id,
        customerUserId: testCustomer.id,
        loyaltyProgramId: testProgram.id,
        targetValue: testProgram.targetValue,
      },
    });
  // El mismo usuario global participa en ambos comercios mediante relaciones independientes.
  await prisma.customerBusiness.upsert({
    where: {
      customerUserId_businessId: {
        customerUserId: testCustomer.id,
        businessId: business.id,
      },
    },
    update: { status: MembershipStatus.ACTIVE },
    create: {
      customerUserId: testCustomer.id,
      businessId: business.id,
      status: MembershipStatus.ACTIVE,
    },
  });
  await prisma.manualCustomer.upsert({
    where: { businessId_rut: { businessId: business.id, rut: "999999999" } },
    update: {
      firstName: "Elena",
      lastName: "Demo",
      segment: ManualCustomerSegment.SENIOR,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      businessId: business.id,
      firstName: "Elena",
      lastName: "Demo",
      rut: "999999999",
      segment: ManualCustomerSegment.SENIOR,
      observation: "Cliente ficticio para pruebas v1.1",
    },
  });
  console.log(
    `Piloto listo: ${business.name}, dueño ${ownerEmail}, cajero ${cashierEmail}, cliente ${customerEmail}.`,
  );
}
main().finally(() => prisma.$disconnect());
