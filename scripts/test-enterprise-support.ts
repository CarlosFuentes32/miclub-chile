import assert from "node:assert/strict";
import { SupportTicketPriority, SupportTicketStatus, UserRole, UserStatus } from "@prisma/client";
import { SupportService } from "../backend/api/src/support/support.service";

const auditEvents: any[] = [];
const now = new Date("2026-07-12T00:00:00.000Z");

function createService() {
  const tickets: any[] = [];
  const timeline: any[] = [];
  const notes: any[] = [];
  const sessions = [{ id: "session-1", userId: "user-1", revokedAt: null, createdAt: now }];
  const users = [
    { id: "user-1", name: "QA Cliente", email: "cliente.qa@example.com", phone: "+56912345678", rut: "11111111-1", role: UserRole.CUSTOMER, status: UserStatus.ACTIVE, lockedAt: now, deletedAt: null, failedLoginAttempts: 5, createdAt: now, updatedAt: now },
  ];
  const businesses = [
    { id: "biz-1", name: "Comercio QA", slug: "comercio-qa", businessType: "retail", rutBusiness: "76123456-7", email: "local.qa@example.com", phone: "+56987654321", status: "ACTIVE", createdAt: now, updatedAt: now },
  ];
  const prisma: any = {
    supportTicket: {
      count: async () => tickets.length,
      findMany: async () => tickets,
      findUnique: async ({ where }: any) => tickets.find((t) => t.id === where.id) ?? null,
      create: async ({ data }: any) => {
        const ticket = { id: "ticket-1", status: SupportTicketStatus.NEW, priority: data.priority, category: data.category, createdAt: now, updatedAt: now, ...data, timeline: [], notes: [] };
        tickets.push(ticket);
        if (data.timeline?.create) timeline.push({ id: "tl-1", ticketId: ticket.id, ...data.timeline.create, createdAt: now });
        return { ...ticket, timeline, notes };
      },
      update: async ({ where, data }: any) => {
        const ticket = tickets.find((t) => t.id === where.id);
        Object.assign(ticket, data);
        if (data.timeline?.create) timeline.push({ id: `tl-${timeline.length + 1}`, ticketId: ticket.id, ...data.timeline.create, createdAt: now });
        return { ...ticket, timeline, notes };
      },
    },
    supportSlaPolicy: { findUnique: async () => ({ firstResponseMinutes: 15, resolutionMinutes: 60 }) },
    supportInternalNote: { create: async ({ data }: any) => { const note = { id: "note-1", ...data, createdAt: now }; notes.push(note); return note; }, findMany: async () => notes },
    supportTimelineEvent: { create: async ({ data }: any) => { const event = { id: `tl-${timeline.length + 1}`, ...data, createdAt: now }; timeline.push(event); return event; } },
    user: {
      count: async () => 1,
      findMany: async () => users,
      findUnique: async ({ where }: any) => users.find((u) => u.id === where.id) ?? null,
      update: async ({ where, data }: any) => Object.assign(users.find((u) => u.id === where.id), data),
    },
    business: { count: async () => 1, findMany: async () => businesses, findUnique: async ({ where }: any) => businesses.find((b) => b.id === where.id) ? { ...businesses[0], owner: users[0], plan: { name: "QA" }, subscription: null } : null },
    incident: { count: async () => 0, findMany: async () => [] },
    systemError: { count: async () => 0, findMany: async () => [] },
    authSession: {
      count: async () => 0,
      findMany: async () => sessions,
      updateMany: async ({ where, data }: any) => {
        const matching = sessions.filter((s) => s.userId === where.userId && (!where.id || s.id === where.id) && s.revokedAt === null);
        matching.forEach((s) => Object.assign(s, data));
        return { count: matching.length };
      },
    },
    customerBusiness: { count: async () => 0, findMany: async () => [] },
    loyaltyProgram: { findMany: async () => [] },
    reward: { findMany: async () => [] },
    transaction: { findMany: async () => [] },
    auditLog: { findMany: async () => [] },
    businessUser: { findMany: async () => [] },
    supportMacro: { findMany: async () => [] },
    knowledgeArticle: { findMany: async () => [] },
  };
  const audit = { create: async (event: any) => { auditEvents.push(event); return event; } };
  const auth = { requestPasswordReset: async () => ({ message: "ok" }) };
  return { service: new SupportService(prisma, audit as any, auth as any), tickets, users, sessions };
}

async function main() {
  const { service, tickets, users, sessions } = createService();
  const supportActor = { id: "support-1", role: UserRole.SUPPORT, email: "support@example.com" } as any;
  const customerActor = { id: "customer-1", role: UserRole.CUSTOMER, email: "customer@example.com" } as any;

  await assert.rejects(() => service.dashboard(customerActor), /Rol de soporte requerido/);

  const search = await service.search({ q: "qa", reason: "Diagnóstico solicitado por comercio" }, supportActor);
  assert.equal(search.users[0].email, "cl***@example.com");
  assert.equal(search.users[0].phone, "***5678");
  assert.equal(search.businesses[0].email, "lo***@example.com");
  assert.ok(auditEvents.some((e) => e.action === "support_search"));

  const ticket = await service.createTicket({ title: "Usuario no puede ingresar", description: "Cliente reporta bloqueo de acceso", category: "ACCESS" as any, priority: SupportTicketPriority.CRITICAL }, supportActor);
  assert.equal(ticket.priority, SupportTicketPriority.CRITICAL);
  assert.equal(tickets.length, 1);

  await service.sendPasswordReset("user-1", { reason: "Recuperación validada con cliente", ticketId: ticket.id }, supportActor);
  await service.revokeAllUserSessions("user-1", { reason: "Posible sesión comprometida", ticketId: ticket.id }, supportActor);
  assert.ok(sessions[0].revokedAt);

  await service.unlockUser("user-1", { reason: "Identidad validada y ticket activo", ticketId: ticket.id }, supportActor);
  assert.equal(users[0].lockedAt, null);
  assert.equal(users[0].failedLoginAttempts, 0);

  const impersonation = await service.requestLimitedImpersonation({ reason: "Diagnóstico visual solicitado", ticketId: ticket.id }, supportActor);
  assert.equal(impersonation.enabled, false);
  assert.ok(auditEvents.some((e) => e.action === "support_impersonation_denied_disabled"));

  console.log("OK: soporte enterprise, permisos, tickets, privacidad, herramientas y auditoría verificados");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
