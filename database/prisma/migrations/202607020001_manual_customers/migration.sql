CREATE TYPE "ManualCustomerSegment" AS ENUM ('general', 'senior');
CREATE TYPE "ManualMovementType" AS ENUM ('stamp', 'purchase', 'points', 'benefit_redeemed');

CREATE TABLE "manual_customers" (
  "id" TEXT PRIMARY KEY,
  "business_id" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "rut" TEXT,
  "phone" TEXT,
  "birth_date" DATE,
  "segment" "ManualCustomerSegment" NOT NULL DEFAULT 'general',
  "observation" TEXT,
  "status" "MembershipStatus" NOT NULL DEFAULT 'active',
  "points" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "stamps" INTEGER NOT NULL DEFAULT 0,
  "purchases" INTEGER NOT NULL DEFAULT 0,
  "program_progress" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "available_benefits" INTEGER NOT NULL DEFAULT 0,
  "redeemed_benefits" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "manual_customer_movements" (
  "id" TEXT PRIMARY KEY,
  "manual_customer_id" TEXT NOT NULL,
  "business_id" TEXT NOT NULL,
  "performed_by_user_id" TEXT NOT NULL,
  "type" "ManualMovementType" NOT NULL,
  "value" DECIMAL(14,2) NOT NULL DEFAULT 1,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "manual_customers_business_id_rut_key" ON "manual_customers"("business_id", "rut");
CREATE UNIQUE INDEX "manual_customers_business_id_phone_key" ON "manual_customers"("business_id", "phone");
CREATE INDEX "manual_customers_business_status_segment_idx" ON "manual_customers"("business_id", "status", "segment");
CREATE INDEX "manual_customers_business_name_idx" ON "manual_customers"("business_id", "first_name", "last_name");
CREATE INDEX "manual_customer_movements_customer_created_idx" ON "manual_customer_movements"("manual_customer_id", "created_at");
CREATE INDEX "manual_customer_movements_business_created_idx" ON "manual_customer_movements"("business_id", "created_at");
ALTER TABLE "manual_customers" ADD CONSTRAINT "manual_customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manual_customer_movements" ADD CONSTRAINT "manual_customer_movements_customer_id_fkey" FOREIGN KEY ("manual_customer_id") REFERENCES "manual_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manual_customer_movements" ADD CONSTRAINT "manual_customer_movements_performer_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
