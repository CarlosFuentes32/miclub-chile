ALTER TABLE "auth_sessions"
  ADD COLUMN "family_id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN "revoked_reason" TEXT,
  ADD COLUMN "last_used_at" TIMESTAMP(3),
  ADD COLUMN "user_agent" TEXT,
  ADD COLUMN "ip_hash" TEXT,
  ADD COLUMN "device_label" TEXT,
  ADD COLUMN "reuse_detected_at" TIMESTAMP(3);

CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions"("family_id");
CREATE INDEX "auth_sessions_user_id_revoked_at_expires_at_idx" ON "auth_sessions"("user_id", "revoked_at", "expires_at");

CREATE TABLE "rate_limit_buckets" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "reset_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limit_buckets_key_key" ON "rate_limit_buckets"("key");
CREATE INDEX "rate_limit_buckets_scope_reset_at_idx" ON "rate_limit_buckets"("scope", "reset_at");
