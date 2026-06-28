import { AccumulationType, MembershipStatus, PrismaClient, ProgramStatus, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD ?? 'MiClubDemo2026!', 12);
  const users = [
    { name: 'Admin MiClub', email: process.env.SEED_ADMIN_EMAIL ?? 'admin@miclub.local', phone: '+56911111111', role: UserRole.MICLUB_ADMIN },
    { name: 'Dueño Café Central', email: 'owner@miclub.local', phone: '+56922222222', role: UserRole.BUSINESS_OWNER },
    { name: 'Cajero Demo', email: 'cashier@miclub.local', phone: '+56933333333', role: UserRole.CASHIER },
    { name: 'Carlos Demo', email: 'customer@miclub.local', phone: '+56995026368', role: UserRole.CUSTOMER },
  ];
  for (const user of users) await prisma.user.upsert({ where: { email: user.email }, update: { ...user, passwordHash, status: UserStatus.ACTIVE }, create: { ...user, passwordHash, status: UserStatus.ACTIVE } });

  const [owner, cashier, customer] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: 'owner@miclub.local' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'cashier@miclub.local' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'customer@miclub.local' } }),
  ]);
  const plan = await prisma.plan.upsert({ where: { name: 'MiClub Start' }, update: { active: true }, create: { name: 'MiClub Start', monthlyPrice: 19990, customerLimit: 500, collaboratorLimit: 3, features: ['Programa de fidelización', 'Panel cajero', 'QR de inscripción'] } });
  const business = await prisma.business.upsert({
    where: { slug: 'cafe-central' }, update: { ownerUserId: owner.id, planId: plan.id },
    create: { name: 'Café Central', slug: 'cafe-central', businessType: 'Cafetería', rutBusiness: '76.111.222-3', ownerUserId: owner.id, phone: '+56222334455', email: 'hola@cafecentral.local', address: 'Av. Demo 123, Santiago', planId: plan.id },
  });
  for (const member of [{ userId: owner.id, role: UserRole.BUSINESS_OWNER }, { userId: cashier.id, role: UserRole.CASHIER }]) {
    await prisma.businessUser.upsert({ where: { businessId_userId: { businessId: business.id, userId: member.userId } }, update: { role: member.role, status: MembershipStatus.ACTIVE }, create: { businessId: business.id, ...member, status: MembershipStatus.ACTIVE } });
  }
  await prisma.auditLog.deleteMany({ where: { businessId: business.id } });
  await prisma.reward.deleteMany({ where: { businessId: business.id } });
  await prisma.transaction.deleteMany({ where: { businessId: business.id } });
  await prisma.cycle.deleteMany({ where: { businessId: business.id } });
  await prisma.customerBusiness.upsert({ where: { customerUserId_businessId: { customerUserId: customer.id, businessId: business.id } }, update: { status: MembershipStatus.ACTIVE }, create: { customerUserId: customer.id, businessId: business.id } });
  await prisma.loyaltyProgram.upsert({
    where: { businessId_version: { businessId: business.id, version: 1 } }, update: { status: ProgramStatus.ACTIVE },
    create: { businessId: business.id, name: '10 compras', accumulationType: AccumulationType.PURCHASE_COUNT, targetValue: 10, rewardDescription: '1 café a elección', rewardExpirationDays: 30, version: 1, status: ProgramStatus.ACTIVE },
  });
  console.log(`Seed completado: ${users.length} usuarios, Café Central y programa 10 compras.`);
}

main().finally(() => prisma.$disconnect());
