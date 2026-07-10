CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'closed', 'discarded');

CREATE TABLE "commercial_leads" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "business" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'landing',
  "status" "LeadStatus" NOT NULL DEFAULT 'new',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "commercial_leads_status_created_at_idx" ON "commercial_leads"("status", "created_at");
CREATE INDEX "commercial_leads_email_idx" ON "commercial_leads"("email");
