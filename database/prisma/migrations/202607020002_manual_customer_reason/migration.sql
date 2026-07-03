CREATE TYPE "ManualRegistrationReason" AS ENUM ('senior', 'no_smartphone', 'no_internet', 'preferred', 'other');
ALTER TABLE "manual_customers" ADD COLUMN "registration_reason" "ManualRegistrationReason" NOT NULL DEFAULT 'senior';
