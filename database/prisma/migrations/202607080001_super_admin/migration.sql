ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'deleted';

CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" TEXT PRIMARY KEY,
  "value" JSONB NOT NULL,
  "updated_by_id" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "support_notes" (
  "id" TEXT PRIMARY KEY,
  "subject_user_id" TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "impersonation_sessions" (
  "id" TEXT PRIMARY KEY,
  "actor_user_id" TEXT NOT NULL,
  "target_user_id" TEXT NOT NULL,
  "target_role" "UserRole" NOT NULL,
  "reason" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "manual_adjustments" (
  "id" TEXT PRIMARY KEY,
  "customer_user_id" TEXT NOT NULL,
  "business_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" DECIMAL(14,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "merchant_plan_history" (
  "id" TEXT PRIMARY KEY,
  "business_id" TEXT NOT NULL,
  "old_plan_id" TEXT,
  "new_plan_id" TEXT,
  "actor_user_id" TEXT NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "support_notes_subject_created_idx" ON "support_notes"("subject_user_id","created_at");
CREATE INDEX IF NOT EXISTS "impersonation_actor_started_idx" ON "impersonation_sessions"("actor_user_id","started_at");
CREATE INDEX IF NOT EXISTS "impersonation_target_started_idx" ON "impersonation_sessions"("target_user_id","started_at");
CREATE INDEX IF NOT EXISTS "manual_adjustments_customer_business_created_idx" ON "manual_adjustments"("customer_user_id","business_id","created_at");
CREATE INDEX IF NOT EXISTS "merchant_plan_history_business_created_idx" ON "merchant_plan_history"("business_id","created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_idx" ON "audit_logs"("action","created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_created_idx" ON "audit_logs"("entity_type","entity_id","created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_notes_subject_user_id_fkey') THEN
    ALTER TABLE "support_notes" ADD CONSTRAINT "support_notes_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_notes_author_user_id_fkey') THEN
    ALTER TABLE "support_notes" ADD CONSTRAINT "support_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'impersonation_sessions_actor_user_id_fkey') THEN
    ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'impersonation_sessions_target_user_id_fkey') THEN
    ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manual_adjustments_customer_user_id_fkey') THEN
    ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manual_adjustments_actor_user_id_fkey') THEN
    ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manual_adjustments_business_id_fkey') THEN
    ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_plan_history_business_id_fkey') THEN
    ALTER TABLE "merchant_plan_history" ADD CONSTRAINT "merchant_plan_history_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "users"
SET "role" = 'SUPER_ADMIN'
WHERE "email" IN ('administrador@miclubchile.cl', 'prueba.admin@miclubchile.cl')
  AND "role" = 'MICLUB_ADMIN';
