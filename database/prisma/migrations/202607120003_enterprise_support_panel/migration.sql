-- Sprint 6: Enterprise support panel.
-- Non-destructive migration: adds SUPPORT role and support-only operational tables.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';

CREATE TYPE "SupportTicketStatus" AS ENUM ('new', 'open', 'investigating', 'waiting_customer', 'waiting_internal', 'resolved', 'closed', 'reopened');
CREATE TYPE "SupportTicketPriority" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "SupportTicketCategory" AS ENUM ('acceso', 'cuenta', 'comercio', 'cajero', 'cliente', 'programa', 'recompensa', 'transaccion', 'canje', 'facturacion', 'seguridad', 'incidente', 'configuracion', 'otro');
CREATE TYPE "SupportTimelineType" AS ENUM ('created', 'status_changed', 'assigned', 'note', 'email_sent', 'session_revoked', 'reset_sent', 'impersonation', 'audit_linked', 'error_linked', 'incident_linked', 'resolved');
CREATE TYPE "SupportMacroStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "KnowledgeArticleStatus" AS ENUM ('draft', 'published', 'archived');

CREATE TABLE "support_tickets" (
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

CREATE TABLE "support_internal_notes" (
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

CREATE TABLE "support_timeline_events" (
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

CREATE TABLE "support_sla_policies" (
  "id" TEXT NOT NULL,
  "priority" "SupportTicketPriority" NOT NULL,
  "first_response_minutes" INTEGER NOT NULL,
  "resolution_minutes" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_sla_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_macros" (
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

CREATE TABLE "knowledge_articles" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "SupportTicketCategory" NOT NULL DEFAULT 'otro',
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "body" TEXT NOT NULL,
  "status" "KnowledgeArticleStatus" NOT NULL DEFAULT 'draft',
  "authorized_roles" "UserRole"[] NOT NULL DEFAULT ARRAY['SUPPORT','SUPER_ADMIN']::"UserRole"[],
  "author_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_sla_policies_priority_key" ON "support_sla_policies"("priority");
CREATE INDEX "support_tickets_status_priority_created_at_idx" ON "support_tickets"("status", "priority", "created_at");
CREATE INDEX "support_tickets_business_id_status_idx" ON "support_tickets"("business_id", "status");
CREATE INDEX "support_tickets_user_id_status_idx" ON "support_tickets"("user_id", "status");
CREATE INDEX "support_tickets_request_id_idx" ON "support_tickets"("request_id");
CREATE INDEX "support_tickets_correlation_id_idx" ON "support_tickets"("correlation_id");
CREATE INDEX "support_tickets_incident_id_idx" ON "support_tickets"("incident_id");
CREATE INDEX "support_internal_notes_subject_type_subject_id_created_at_idx" ON "support_internal_notes"("subject_type", "subject_id", "created_at");
CREATE INDEX "support_internal_notes_ticket_id_created_at_idx" ON "support_internal_notes"("ticket_id", "created_at");
CREATE INDEX "support_timeline_events_ticket_id_created_at_idx" ON "support_timeline_events"("ticket_id", "created_at");
CREATE INDEX "support_timeline_events_type_created_at_idx" ON "support_timeline_events"("type", "created_at");
CREATE INDEX "support_macros_status_category_idx" ON "support_macros"("status", "category");
CREATE INDEX "knowledge_articles_status_category_idx" ON "knowledge_articles"("status", "category");

ALTER TABLE "support_internal_notes"
  ADD CONSTRAINT "support_internal_notes_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_timeline_events"
  ADD CONSTRAINT "support_timeline_events_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "support_sla_policies" ("id", "priority", "first_response_minutes", "resolution_minutes", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'critical', 15, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'high', 60, 480, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'medium', 240, 1440, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'low', 1440, 4320, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("priority") DO NOTHING;

INSERT INTO "support_macros" ("id", "title", "category", "body", "status", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'Recuperación de contraseña', 'acceso', 'Hola {{nombre}}, te enviaremos un enlace seguro para recuperar tu contraseña. Nunca compartas claves ni códigos con terceros.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cuenta bloqueada', 'cuenta', 'Detectamos intentos fallidos de acceso. Validaremos tu identidad y, si corresponde, desbloquearemos la cuenta de forma segura.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Recompensa no disponible', 'recompensa', 'Revisaremos el programa activo, progreso, transacciones recientes y estado de la recompensa para confirmar la causa.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Canje fallido', 'canje', 'Revisaremos el estado de la recompensa, cajero, fecha de canje y request ID para evitar duplicidad o pérdida de beneficios.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Ticket resuelto', 'otro', 'Tu solicitud fue revisada y marcada como resuelta. Si el problema reaparece, responde este ticket para reabrirlo.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "knowledge_articles" ("id", "title", "category", "keywords", "body", "status", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'Cómo recuperar contraseña', 'acceso', ARRAY['login','password','recuperacion'], 'Verifica estado de cuenta, bloqueo y envía recuperación desde herramienta segura asociada a ticket activo.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cómo crear un cajero', 'cajero', ARRAY['cajero','colaborador'], 'El comercio debe crear colaboradores desde su panel. Soporte solo diagnostica invitación, estado y sesiones.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cómo crear un programa', 'programa', ARRAY['programa','puntos','sellos','cashback'], 'Validar comercio, plan, programa activo y estado de publicación antes de escalar.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cómo crear una recompensa', 'recompensa', ARRAY['recompensa','beneficio'], 'Confirmar que existe programa activo, reglas correctas y que la recompensa no esté vencida o canjeada.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cómo registrar una compra', 'transaccion', ARRAY['compra','puntos','sellos'], 'Revisar cajero, comercio, cliente, programa aplicado, cálculo y request ID.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cómo canjear', 'canje', ARRAY['canje','qr'], 'Validar recompensa disponible, expiración, cajero autorizado y ausencia de doble canje.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cómo reactivar un usuario', 'cuenta', ARRAY['reactivar','eliminado','suspendido'], 'Revisar estado anterior, auditoría, motivo, sesiones y confirmar regla antes de solicitar reactivación.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cómo investigar un Request ID', 'incidente', ARRAY['request id','correlation id','logs'], 'Buscar request ID en soporte, revisar errores, auditoría, incidente relacionado y escalar con evidencia.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cómo actuar ante API caída', 'incidente', ARRAY['api','health','caida'], 'Revisar health live/ready/detallado, incidentes activos y runbook de escalamiento.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cómo escalar un incidente', 'incidente', ARRAY['incidente','escalamiento'], 'Vincular ticket, request ID, severidad, impacto, evidencia y responsable antes de escalar.', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
