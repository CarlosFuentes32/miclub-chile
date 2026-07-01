ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3), ADD COLUMN "deleted_by_user_id" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "users_deleted_by_user_id_idx" ON "users"("deleted_by_user_id");
UPDATE "users" SET "status" = 'DELETED', "deleted_at" = COALESCE("deleted_at", NOW()) WHERE "status" = 'INACTIVE';
