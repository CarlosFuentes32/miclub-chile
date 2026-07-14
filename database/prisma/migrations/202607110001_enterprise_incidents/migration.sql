CREATE TYPE "IncidentSeverity" AS ENUM ('critical', 'high', 'medium');
CREATE TYPE "IncidentStatus" AS ENUM ('detected', 'investigating', 'identified', 'monitoring', 'resolved');
CREATE TYPE "IncidentActionType" AS ENUM ('detected', 'status_changed', 'note_added', 'alert_sent', 'alert_suppressed', 'recovery_detected', 'resolved');
CREATE TYPE "IncidentAlertChannel" AS ENUM ('email', 'slack', 'whatsapp');

CREATE TABLE "incidents" (
  "id" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "severity" "IncidentSeverity" NOT NULL,
  "status" "IncidentStatus" NOT NULL DEFAULT 'detected',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recovered_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "duration_seconds" INTEGER,
  "deployed_version" TEXT,
  "commit" TEXT,
  "summary" TEXT NOT NULL,
  "technical_detail" TEXT,
  "source" TEXT NOT NULL DEFAULT 'monitor',
  "responsible" TEXT,
  "final_status" TEXT,
  "last_alert_at" TIMESTAMP(3),
  "alert_cooldown_until" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "incident_actions" (
  "id" TEXT NOT NULL,
  "incident_id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "action" "IncidentActionType" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "incident_alerts" (
  "id" TEXT NOT NULL,
  "incident_id" TEXT NOT NULL,
  "channel" "IncidentAlertChannel" NOT NULL,
  "status" TEXT NOT NULL,
  "recipient" TEXT,
  "message" TEXT,
  "provider_id" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "incidents_environment_status_severity_created_at_idx" ON "incidents"("environment", "status", "severity", "created_at");
CREATE INDEX "incidents_service_environment_status_idx" ON "incidents"("service", "environment", "status");
CREATE INDEX "incidents_dedupe_key_environment_status_idx" ON "incidents"("dedupe_key", "environment", "status");
CREATE INDEX "incident_actions_incident_id_created_at_idx" ON "incident_actions"("incident_id", "created_at");
CREATE INDEX "incident_actions_actor_user_id_created_at_idx" ON "incident_actions"("actor_user_id", "created_at");
CREATE INDEX "incident_alerts_incident_id_channel_created_at_idx" ON "incident_alerts"("incident_id", "channel", "created_at");

ALTER TABLE "incident_actions" ADD CONSTRAINT "incident_actions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_alerts" ADD CONSTRAINT "incident_alerts_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
