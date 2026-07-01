ALTER TABLE "users"
  ADD COLUMN "force_password_change" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_at" TIMESTAMP(3);

UPDATE "users" SET "email" = 'administrador@miclubchile.cl' WHERE "email" = 'admin@miclub.local' AND "role" = 'MICLUB_ADMIN';

CREATE TABLE "user_changes" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "old_value" TEXT,
  "new_value" TEXT,
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "user_changes_user_id_created_at_idx" ON "user_changes"("user_id", "created_at");
ALTER TABLE "user_changes" ADD CONSTRAINT "user_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_changes" ADD CONSTRAINT "user_changes_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON UPDATE CASCADE;
