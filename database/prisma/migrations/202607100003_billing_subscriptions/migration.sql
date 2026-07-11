CREATE TYPE "BillingPeriod" AS ENUM ('monthly', 'yearly');
CREATE TYPE "PlanStatus" AS ENUM ('active', 'inactive');
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'suspended', 'cancelled', 'expired');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'failed');
CREATE TYPE "PaymentProvider" AS ENUM ('manual', 'mercado_pago', 'flow');
CREATE TYPE "WebhookEventStatus" AS ENUM ('received', 'processed', 'ignored', 'failed');

ALTER TABLE "plans"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'CLP',
ADD COLUMN "billing_period" "BillingPeriod" NOT NULL DEFAULT 'monthly',
ADD COLUMN "trial_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" "PlanStatus" NOT NULL DEFAULT 'active';

CREATE TABLE "business_subscriptions" (
  "id" TEXT NOT NULL,
  "business_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trial_ends_at" TIMESTAMP(3),
  "current_period_starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "current_period_ends_at" TIMESTAMP(3),
  "next_billing_at" TIMESTAMP(3),
  "grace_ends_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cancellation_reason" TEXT,
  "external_provider" "PaymentProvider",
  "external_subscription_id" TEXT,
  "last_payment_status" "PaymentStatus",
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_payments" (
  "id" TEXT NOT NULL,
  "provider_payment_id" TEXT,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'manual',
  "business_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CLP',
  "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "paid_at" TIMESTAMP(3),
  "period_start" TIMESTAMP(3),
  "period_end" TIMESTAMP(3),
  "payment_method" TEXT,
  "reference" TEXT,
  "idempotency_key" TEXT,
  "provider_payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_payment_history" (
  "id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "old_status" "PaymentStatus",
  "new_status" "PaymentStatus" NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_payment_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'received',
  "signature_valid" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3),
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_subscriptions_business_id_key" ON "business_subscriptions"("business_id");
CREATE UNIQUE INDEX "business_subscriptions_external_subscription_id_key" ON "business_subscriptions"("external_subscription_id");
CREATE INDEX "business_subscriptions_status_next_billing_at_idx" ON "business_subscriptions"("status", "next_billing_at");
CREATE INDEX "business_subscriptions_plan_id_idx" ON "business_subscriptions"("plan_id");

CREATE UNIQUE INDEX "billing_payments_provider_payment_id_key" ON "billing_payments"("provider_payment_id");
CREATE UNIQUE INDEX "billing_payments_idempotency_key_key" ON "billing_payments"("idempotency_key");
CREATE INDEX "billing_payments_business_id_status_created_at_idx" ON "billing_payments"("business_id", "status", "created_at");
CREATE INDEX "billing_payments_subscription_id_idx" ON "billing_payments"("subscription_id");

CREATE INDEX "billing_payment_history_payment_id_created_at_idx" ON "billing_payment_history"("payment_id", "created_at");

CREATE UNIQUE INDEX "billing_webhook_events_provider_event_id_key" ON "billing_webhook_events"("provider", "event_id");
CREATE INDEX "billing_webhook_events_status_created_at_idx" ON "billing_webhook_events"("status", "created_at");

ALTER TABLE "business_subscriptions"
ADD CONSTRAINT "business_subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_subscriptions"
ADD CONSTRAINT "business_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_payments"
ADD CONSTRAINT "billing_payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_payments"
ADD CONSTRAINT "billing_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "business_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_payment_history"
ADD CONSTRAINT "billing_payment_history_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "billing_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
