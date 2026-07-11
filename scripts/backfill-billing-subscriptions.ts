import { PrismaClient, SubscriptionStatus } from "@prisma/client";

const prisma = new PrismaClient();

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addBillingPeriod(date: Date, billingPeriod?: string | null) {
  const next = new Date(date);
  if (billingPeriod === "YEARLY") {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }
  next.setMonth(next.getMonth() + 1);
  return next;
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_BILLING_BACKFILL_PRODUCTION !== "true") {
    throw new Error(
      "Backfill bloqueado en producción. Ejecuta primero en staging. Para producción requiere ALLOW_BILLING_BACKFILL_PRODUCTION=true y revisión manual.",
    );
  }

  const businesses = await prisma.business.findMany({
    where: {
      planId: { not: null },
      subscription: null,
    },
    include: {
      plan: true,
    },
  });

  let created = 0;
  const now = new Date();

  for (const business of businesses) {
    if (!business.plan) {
      continue;
    }

    const hasTrial = business.plan.trialDays > 0;
    const trialEndsAt = hasTrial ? addDays(now, business.plan.trialDays) : null;
    const currentPeriodEndsAt = hasTrial ? trialEndsAt : addBillingPeriod(now, business.plan.billingPeriod);

    await prisma.businessSubscription.create({
      data: {
        businessId: business.id,
        planId: business.plan.id,
        status: hasTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        startedAt: now,
        trialEndsAt,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt,
        nextBillingAt: currentPeriodEndsAt,
        lastPaymentStatus: null,
        metadata: {
          source: "billing_backfill",
          businessStatus: business.status,
        },
      },
    });

    created += 1;
  }

  console.log(`Billing backfill finalizado. Suscripciones creadas: ${created}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
