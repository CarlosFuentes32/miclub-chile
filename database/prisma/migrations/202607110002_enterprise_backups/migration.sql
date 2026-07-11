CREATE TYPE "BackupType" AS ENUM (
  'automatic',
  'manual',
  'scheduled',
  'pre_deploy',
  'pre_migration',
  'pre_restore',
  'pre_data_cleanup',
  'simulation'
);

CREATE TYPE "BackupStatus" AS ENUM (
  'requested',
  'running',
  'verified',
  'failed',
  'expired'
);

CREATE TYPE "RestoreStatus" AS ENUM (
  'requested',
  'validating',
  'validated',
  'failed',
  'blocked'
);

CREATE TYPE "RollbackStatus" AS ENUM (
  'planned',
  'validated',
  'blocked',
  'completed',
  'failed'
);

CREATE TABLE "backup_records" (
  "id" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "database_name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "commit" TEXT NOT NULL,
  "branch" TEXT,
  "responsible_id" TEXT,
  "responsible_name" TEXT,
  "type" "BackupType" NOT NULL,
  "status" "BackupStatus" NOT NULL DEFAULT 'requested',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "size_bytes" BIGINT,
  "checksum" TEXT,
  "result" TEXT,
  "storage_provider" TEXT NOT NULL DEFAULT 'provider_or_logical',
  "storage_ref" TEXT,
  "validation" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restore_records" (
  "id" TEXT NOT NULL,
  "backup_id" TEXT,
  "environment" TEXT NOT NULL,
  "target_environment" TEXT NOT NULL,
  "temporary_database_ref" TEXT,
  "requested_by_id" TEXT,
  "requested_by_name" TEXT,
  "status" "RestoreStatus" NOT NULL DEFAULT 'requested',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "validation" JSONB,
  "result" TEXT,
  "safety_notes" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "restore_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rollback_plans" (
  "id" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "requested_by_id" TEXT,
  "requested_by_name" TEXT,
  "status" "RollbackStatus" NOT NULL DEFAULT 'planned',
  "reason" TEXT NOT NULL,
  "from_commit" TEXT,
  "to_commit" TEXT,
  "backup_id" TEXT,
  "migration_plan" JSONB,
  "variable_plan" JSONB,
  "validation" JSONB,
  "result" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rollback_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "backup_records_environment_status_started_at_idx" ON "backup_records"("environment", "status", "started_at");
CREATE INDEX "backup_records_type_started_at_idx" ON "backup_records"("type", "started_at");
CREATE INDEX "restore_records_environment_status_started_at_idx" ON "restore_records"("environment", "status", "started_at");
CREATE INDEX "restore_records_backup_id_idx" ON "restore_records"("backup_id");
CREATE INDEX "rollback_plans_environment_status_created_at_idx" ON "rollback_plans"("environment", "status", "created_at");

ALTER TABLE "restore_records"
ADD CONSTRAINT "restore_records_backup_id_fkey"
FOREIGN KEY ("backup_id") REFERENCES "backup_records"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
