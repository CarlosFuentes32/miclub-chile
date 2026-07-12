-- Sprint 6: Enterprise support panel.
-- Non-destructive and re-runnable on staging after a failed first attempt.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketStatus') THEN
    CREATE TYPE "SupportTicketStatus" AS ENUM ('new', 'open', 'investigating', 'waiting_customer', 'waiting_internal', 'resolved', 'closed', 'reopened');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketPriority') THEN
    CREATE TYPE "SupportTicketPriority" AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketCategory') THEN
    CREATE TYPE "SupportTicketCategory" AS ENUM ('acceso', 'cuenta', 'comercio', 'cajero', 'cliente', 'programa', 'recompensa', 'transaccion', 'canje', 'facturacion', 'seguridad', 'incidente', 'configuracion', 'otro');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTimelineType') THEN
    CREATE TYPE "SupportTimelineType" AS ENUM ('created', 'status_changed', 'assigned', 'note', 'email_sent', 'session_revoked', 'reset_sent', 'impersonation', 'audit_linked', 'error_linked', 'incident_linked', 'resolved');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportMacroStatus') THEN
    CREATE TYPE "SupportMacroStatus" AS ENUM ('draft', 'published', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KnowledgeArticleStatus') THEN
    CREATE TYPE "KnowledgeArticleStatus" AS ENUM ('draft', 'published', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "SupportTicketCategory" NOT NULL DEFAULT 'otro',
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'medium',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'new',
  "origin_channel" TEXT NOT NULL DEFAULT 'internal',
  "business_id" TEXT,
  "user_id" TEXT,
  "cashier_user_id" TEXT,
  "transaction_id" TEXT,
  "reward_id" TEXT,
  "incident_id" TEXT,
  "request_id" TEXT,
  "correlation_id" TEXT,
  "assigned_agent_id" TEXT,
  "created_by_id" TEXT,
  "first_response_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "sla_first_response_due" TIMESTAMP(3),
  "sla_resolution_due" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_internal_notes" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT,
  "subject_type" TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "author_id" TEXT,
  "body" TEXT NOT NULL,
  "edited_at" TIMESTAMP(3),
  "edit_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_internal_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_timeline_events" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "type" "SupportTimelineType" NOT NULL,
  "actor_id" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "request_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_sla_policies" (
  "id" TEXT NOT NULL,
  "priority" "SupportTicketPriority" NOT NULL,
  "first_response_minutes" INTEGER NOT NULL,
  "resolution_minutes" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_sla_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_macros" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "SupportTicketCategory" NOT NULL DEFAULT 'otro',
  "body" TEXT NOT NULL,
  "status" "SupportMacroStatus" NOT NULL DEFAULT 'draft',
  "variables" JSONB,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_macros_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "knowledge_articles" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "SupportTicketCategory" NOT NULL DEFAULT 'otro',
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "body" TEXT NOT NULL,
  "status" "KnowledgeArticleStatus" NOT NULL DEFAULT 'draft',
  "authorized_roles" "UserRole"[] NOT NULL DEFAULT ARRAY[]::"UserRole"[],
  "author_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "support_sla_policies_priority_key" ON "support_sla_policies"("priority");
CREATE INDEX IF NOT EXISTS "support_tickets_status_priority_created_at_idx" ON "support_tickets"("status", "priority", "created_at");
CREATE INDEX IF NOT EXISTS "support_tickets_business_id_status_idx" ON "support_tickets"("business_id", "status");
CREATE INDEX IF NOT EXISTS "support_tickets_user_id_status_idx" ON "support_tickets"("user_id", "status");
CREATE INDEX IF NOT EXISTS "support_tickets_request_id_idx" ON "support_tickets"("request_id");
CREATE INDEX IF NOT EXISTS "support_tickets_correlation_id_idx" ON "support_tickets"("correlation_id");
CREATE INDEX IF NOT EXISTS "support_tickets_incident_id_idx" ON "support_tickets"("incident_id");
CREATE INDEX IF NOT EXISTS "support_internal_notes_subject_type_subject_id_created_at_idx" ON "support_internal_notes"("subject_type", "subject_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_internal_notes_ticket_id_created_at_idx" ON "support_internal_notes"("ticket_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_timeline_events_ticket_id_created_at_idx" ON "support_timeline_events"("ticket_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_timeline_events_type_created_at_idx" ON "support_timeline_events"("type", "created_at");
CREATE INDEX IF NOT EXISTS "support_macros_status_category_idx" ON "support_macros"("status", "category");
CREATE INDEX IF NOT EXISTS "knowledge_articles_status_category_idx" ON "knowledge_articles"("status", "category");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_internal_notes_ticket_id_fkey') THEN
    ALTER TABLE "support_internal_notes"
      ADD CONSTRAINT "support_internal_notes_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_timeline_events_ticket_id_fkey') THEN
    ALTER TABLE "support_timeline_events"
      ADD CONSTRAINT "support_timeline_events_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "support_sla_policies" ("id", "priority", "first_response_minutes", "resolution_minutes", "created_at", "updated_at")
VALUES
  ('support-sla-critical', 'critical', 15, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('support-sla-high', 'high', 60, 480, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('support-sla-medium', 'medium', 240, 1440, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('support-sla-low', 'low', 1440, 4320, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("priority") DO NOTHING;

INSERT INTO "support_macros" ("id", "title", "category", "body", "status", "created_at", "updated_at")
VALUES
  ('support-macro-password-reset', 'Recuperacion de contrasena', 'acceso', 'Hola {{nombre}}, te enviaremos un enlace seguro para recuperar tu contrasena. Nunca compartas claves ni codigos con terceros.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('support-macro-account-locked', 'Cuenta bloqueada', 'cuenta', 'Detectamos intentos fallidos de acceso. Validaremos tu identidad y, si corresponde, desbloquearemos la cuenta de forma segura.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('support-macro-reward-missing', 'Recompensa no disponible', 'recompensa', 'Revisaremos el programa activo, progreso, transacciones recientes y estado de la recompensa para confirmar la causa.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('support-macro-redeem-failed', 'Canje fallido', 'canje', 'Revisaremos el estado de la recompensa, cajero, fecha de canje y request ID para evitar duplicidad o perdida de beneficios.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('support-macro-ticket-resolved', 'Ticket resuelto', 'otro', 'Tu solicitud fue revisada y marcada como resuelta. Si el problema reaparece, responde este ticket para reabrirlo.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "knowledge_articles" ("id", "title", "category", "keywords", "body", "status", "created_at", "updated_at")
VALUES
  ('kb-password-reset', 'Como recuperar contrasena', 'acceso', ARRAY['login','password','recuperacion'], 'Verifica estado de cuenta, bloqueo y envia recuperacion desde herramienta segura asociada a ticket activo.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kb-create-cashier', 'Como crear un cajero', 'cajero', ARRAY['cajero','colaborador'], 'El comercio debe crear colaboradores desde su panel. Soporte solo diagnostica invitacion, estado y sesiones.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kb-create-program', 'Como crear un programa', 'programa', ARRAY['programa','puntos','sellos','cashback'], 'Validar comercio, plan, programa activo y estado de publicacion antes de escalar.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kb-create-reward', 'Como crear una recompensa', 'recompensa', ARRAY['recompensa','beneficio'], 'Confirmar que existe programa activo, reglas correctas y que la recompensa no este vencida o canjeada.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kb-register-purchase', 'Como registrar una compra', 'transaccion', ARRAY['compra','puntos','sellos'], 'Revisar cajero, comercio, cliente, programa aplicado, calculo y request ID.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kb-redeem', 'Como canjear', 'canje', ARRAY['canje','qr'], 'Validar recompensa disponible, expiracion, cajero autorizado y ausencia de doble canje.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kb-reactivate-user', 'Como reactivar un usuario', 'cuenta', ARRAY['reactivar','eliminado','suspendido'], 'Revisar estado anterior, auditoria, motivo, sesiones y confirmar regla antes de solicitar reactivacion.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kb-request-id', 'Como investigar un Request ID', 'incidente', ARRAY['request id','correlation id','logs'], 'Buscar request ID en soporte, revisar errores, auditoria, incidente relacionado y escalar con evidencia.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kb-api-down', 'Como actuar ante API caida', 'incidente', ARRAY['api','health','caida'], 'Revisar health live/ready/detallado, incidentes activos y runbook de escalamiento.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kb-escalate-incident', 'Como escalar un incidente', 'incidente', ARRAY['incidente','escalamiento'], 'Vincular ticket, request ID, severidad, impacto, evidencia y responsable antes de escalar.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
