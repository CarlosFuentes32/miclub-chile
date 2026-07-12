-- Sprint 7 Enterprise billing hardening.
-- Non-destructive migration: no DELETE, TRUNCATE, DROP TABLE or destructive column changes.

ALTER TYPE "BillingPeriod" ADD VALUE IF NOT EXISTS 'quarterly';
ALTER TYPE "BillingPeriod" ADD VALUE IF NOT EXISTS 'semiannual';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'grace_period';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'reversed';

DO $$ BEGIN
  CREATE TYPE "BillingEventType" AS ENUM (
    'subscription_created',
    'plan_changed',
    'price_changed',
    'discount_applied',
    'payment_registered',
    'payment_approved',
    'payment_rejected',
    'payment_reversed',
    'due_date_changed',
    'trial_extended',
    'suspended',
    'reactivated',
    'cancelled',
    'reminder_sent',
    'export_created',
    'request_created'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillingRequestType" AS ENUM (
    'plan_change',
    'cancellation',
    'trial_extension',
    'payment_review',
    'reactivation',
    'billing_question'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillingRequestStatus" AS ENUM (
    'open',
    'reviewing',
    'approved',
    'rejected',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillingReminderType" AS ENUM (
    'trial_ending',
    'trial_expired',
    'payment_upcoming',
    'payment_due',
    'grace_period',
    'suspension_warning',
    'suspended'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "grace_days" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "limits" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "public_visible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allow_new_subscriptions" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS "plans_code_key" ON "plans"("code");
CREATE INDEX IF NOT EXISTS "plans_status_sort_order_idx" ON "plans"("status", "sort_order");

ALTER TABLE "business_subscriptions"
  ADD COLUMN IF NOT EXISTS "trial_started_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reactivated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "agreed_price" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "discount_percent" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "discount_amount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "payment_method" TEXT,
  ADD COLUMN IF NOT EXISTS "auto_renew" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "billing_payments"
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "rejected_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "billing_financial_events" (
  "id" TEXT NOT NULL,
  "business_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "payment_id" TEXT,
  "actor_user_id" TEXT,
  "event_type" "BillingEventType" NOT NULL,
  "previous_state" JSONB,
  "next_state" JSONB,
  "reason" TEXT,
  "request_id" TEXT,
  "correlation_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_financial_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "billing_financial_events_business_id_created_at_idx" ON "billing_financial_events"("business_id", "created_at");
CREATE INDEX IF NOT EXISTS "billing_financial_events_subscription_id_created_at_idx" ON "billing_financial_events"("subscription_id", "created_at");
CREATE INDEX IF NOT EXISTS "billing_financial_events_event_type_created_at_idx" ON "billing_financial_events"("event_type", "created_at");

CREATE TABLE IF NOT EXISTS "billing_discounts" (
  "id" TEXT NOT NULL,
  "business_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "plan_id" TEXT,
  "type" "DiscountType" NOT NULL,
  "value" DECIMAL(12,2) NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "max_cycles" INTEGER,
  "code" TEXT,
  "reason" TEXT NOT NULL,
  "approved_by_id" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_discounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "billing_discounts_business_id_active_idx" ON "billing_discounts"("business_id", "active");
CREATE INDEX IF NOT EXISTS "billing_discounts_subscription_id_active_idx" ON "billing_discounts"("subscription_id", "active");

ALTER TABLE "billing_discounts"
  ADD CONSTRAINT "billing_discounts_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "business_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "billing_requests" (
  "id" TEXT NOT NULL,
  "business_id" TEXT NOT NULL,
  "requested_by_id" TEXT NOT NULL,
  "requested_plan_id" TEXT,
  "type" "BillingRequestType" NOT NULL,
  "status" "BillingRequestStatus" NOT NULL DEFAULT 'open',
  "reason" TEXT NOT NULL,
  "support_ticket_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "billing_requests_business_id_status_created_at_idx" ON "billing_requests"("business_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "billing_requests_type_status_idx" ON "billing_requests"("type", "status");

CREATE TABLE IF NOT EXISTS "billing_reminder_runs" (
  "id" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'staging',
  "type" "BillingReminderType" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "processed_count" INTEGER NOT NULL DEFAULT 0,
  "sent_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "idempotency_key" TEXT NOT NULL,
  "metadata" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "billing_reminder_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_reminder_runs_idempotency_key_key" ON "billing_reminder_runs"("idempotency_key");
CREATE INDEX IF NOT EXISTS "billing_reminder_runs_type_started_at_idx" ON "billing_reminder_runs"("type", "started_at");
