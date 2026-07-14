CREATE TYPE "AuditResult" AS ENUM ('success', 'failure', 'denied', 'partial');
CREATE TYPE "AuditRiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "SystemErrorStatus" AS ENUM ('open', 'investigating', 'resolved');

ALTER TABLE "audit_logs"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'development',
  ADD COLUMN "actor_role" TEXT,
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'administration',
  ADD COLUMN "module" TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN "result" "AuditResult" NOT NULL DEFAULT 'success',
  ADD COLUMN "risk_level" "AuditRiskLevel" NOT NULL DEFAULT 'low',
  ADD COLUMN "previous_state" JSONB,
  ADD COLUMN "next_state" JSONB,
  ADD COLUMN "request_id" TEXT,
  ADD COLUMN "correlation_id" TEXT,
  ADD COLUMN "endpoint" TEXT,
  ADD COLUMN "method" TEXT,
  ADD COLUMN "status_code" INTEGER,
  ADD COLUMN "duration_ms" INTEGER,
  ADD COLUMN "ip_hash" TEXT,
  ADD COLUMN "user_agent" TEXT,
  ADD COLUMN "version" TEXT,
  ADD COLUMN "commit" TEXT,
  ADD COLUMN "build_number" TEXT;

CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");
CREATE INDEX "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");
CREATE INDEX "audit_logs_environment_category_result_created_at_idx" ON "audit_logs"("environment", "category", "result", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

CREATE TABLE "system_errors" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "service" TEXT NOT NULL DEFAULT 'api',
  "module" TEXT,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "sanitized_stack" TEXT,
  "endpoint" TEXT,
  "method" TEXT,
  "status_code" INTEGER,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "occurrence_count" INTEGER NOT NULL DEFAULT 1,
  "request_id" TEXT,
  "correlation_id" TEXT,
  "actor_user_id" TEXT,
  "role" TEXT,
  "business_id" TEXT,
  "version" TEXT,
  "commit" TEXT,
  "build_number" TEXT,
  "status" "SystemErrorStatus" NOT NULL DEFAULT 'open',
  "incident_id" TEXT,
  "notes" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_errors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_errors_fingerprint_environment_key" ON "system_errors"("fingerprint", "environment");
CREATE INDEX "system_errors_environment_status_last_seen_at_idx" ON "system_errors"("environment", "status", "last_seen_at");
CREATE INDEX "system_errors_request_id_idx" ON "system_errors"("request_id");
CREATE INDEX "system_errors_correlation_id_idx" ON "system_errors"("correlation_id");
CREATE INDEX "system_errors_incident_id_idx" ON "system_errors"("incident_id");
