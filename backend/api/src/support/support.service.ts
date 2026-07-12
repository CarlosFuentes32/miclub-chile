import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditRiskLevel,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTimelineType,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { JwtUser } from "../auth/auth.types";
import { AuthService } from "../auth/auth.service";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSupportTicketDto, SupportAccessDto, SupportSearchDto, SupportToolDto, UpdateSupportTicketDto } from "./dto/support.dto";

const OPEN_STATUSES = [
  SupportTicketStatus.NEW,
  SupportTicketStatus.OPEN,
  SupportTicketStatus.INVESTIGATING,
  SupportTicketStatus.WAITING_CUSTOMER,
  SupportTicketStatus.WAITING_INTERNAL,
  SupportTicketStatus.REOPENED,
] as SupportTicketStatus[];

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  async dashboard(actor: JwtUser) {
    this.assertSupport(actor);
    const now = new Date();
    const [
      openTickets,
      criticalTickets,
      overdueTickets,
      activeIncidents,
      lockedUsers,
      suspendedBusinesses,
      recentErrors,
      revokedSessions,
      assignedToMe,
    ] = await Promise.all([
      this.prisma.supportTicket.count({ where: { status: { in: OPEN_STATUSES } } }),
      this.prisma.supportTicket.count({ where: { priority: SupportTicketPriority.CRITICAL, status: { in: OPEN_STATUSES } } }),
      this.prisma.supportTicket.count({ where: { status: { in: OPEN_STATUSES }, slaResolutionDue: { lt: now } } }),
      this.prisma.incident.count({ where: { status: { not: "RESOLVED" as any } } }),
      this.prisma.user.count({ where: { lockedAt: { not: null }, status: UserStatus.ACTIVE } }),
      this.prisma.business.count({ where: { status: "SUSPENDED" as any } }),
      this.prisma.systemError.count({ where: { status: { not: "RESOLVED" as any }, lastSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } } }),
      this.prisma.authSession.count({ where: { revokedAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } } }),
      this.prisma.supportTicket.count({ where: { assignedAgentId: actor.id, status: { in: OPEN_STATUSES } } }),
    ]);
    return {
      summary: {
        openTickets,
        criticalTickets,
        overdueTickets,
        activeIncidents,
        lockedUsers,
        suspendedBusinesses,
        recentErrors,
        revokedSessions,
        assignedToMe,
        firstResponseAverageMinutes: null,
        resolutionAverageMinutes: null,
      },
      warnings: ["Métricas promedio quedan en null hasta que existan tickets resueltos con suficiente historial."],
    };
  }

  async search(dto: SupportSearchDto, actor: JwtUser) {
    this.assertSupport(actor);
    this.assertReason(dto.reason);
    const q = dto.q.trim();
    await this.auditAccess(actor, "support_search", "support_search", q, dto.reason, dto.ticketId, AuditRiskLevel.MEDIUM);
    const like = { contains: q, mode: "insensitive" as const };
    const digits = q.replace(/\D/g, "");
    const [users, businesses, tickets, errors, incidents, transactions, rewards] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { id: q },
            { email: like },
            { name: like },
            ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
            ...(q.length >= 6 ? [{ rut: like }] : []),
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.business.findMany({
        where: { OR: [{ id: q }, { name: like }, { rutBusiness: like }, { email: like }] },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.supportTicket.findMany({
        where: { OR: [{ id: q }, { requestId: q }, { correlationId: q }, { title: like }] },
        take: 10,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.systemError.findMany({
        where: { OR: [{ requestId: q }, { correlationId: q }, { fingerprint: q }] },
        take: 10,
        orderBy: { lastSeenAt: "desc" },
      }),
      this.prisma.incident.findMany({
        where: { OR: [{ id: q }, { title: like }, { dedupeKey: q }] },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.transaction.findMany({ where: { id: q }, take: 5, orderBy: { createdAt: "desc" } }),
      this.prisma.reward.findMany({ where: { id: q }, take: 5, orderBy: { generatedAt: "desc" } }),
    ]);
    return {
      users: users.map((user) => this.safeUser(user)),
      businesses: businesses.map((business) => this.safeBusiness(business)),
      tickets,
      errors: errors.map((error) => ({ id: error.id, status: error.status, type: error.type, message: this.truncate(error.message, 160), requestId: error.requestId, correlationId: error.correlationId, lastSeenAt: error.lastSeenAt })),
      incidents: incidents.map((incident) => ({ id: incident.id, title: incident.title, severity: incident.severity, status: incident.status, service: incident.service, createdAt: incident.createdAt })),
      transactions: transactions.map((tx) => ({ id: tx.id, businessId: tx.businessId, customerUserId: tx.customerUserId, status: tx.status, transactionType: tx.transactionType, createdAt: tx.createdAt })),
      rewards: rewards.map((reward) => ({ id: reward.id, businessId: reward.businessId, customerUserId: reward.customerUserId, status: reward.status, generatedAt: reward.generatedAt })),
    };
  }

  async business360(id: string, dto: SupportAccessDto, actor: JwtUser) {
    this.assertSupport(actor);
    this.assertReason(dto.reason);
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { owner: true, plan: true, subscription: true },
    });
    if (!business) throw new NotFoundException("Comercio no encontrado.");
    const [admins, cashiers, customers, programs, rewards, transactions, errors, incidents, tickets, audit] = await Promise.all([
      this.prisma.businessUser.findMany({ where: { businessId: id, role: { in: [UserRole.BUSINESS_OWNER, UserRole.BUSINESS_ADMIN] } }, include: { user: true }, take: 20 }),
      this.prisma.businessUser.findMany({ where: { businessId: id, role: UserRole.CASHIER }, include: { user: true }, take: 20 }),
      this.prisma.customerBusiness.count({ where: { businessId: id } }),
      this.prisma.loyaltyProgram.findMany({ where: { businessId: id }, take: 20, orderBy: { updatedAt: "desc" } }),
      this.prisma.reward.findMany({ where: { businessId: id }, take: 20, orderBy: { generatedAt: "desc" } }),
      this.prisma.transaction.findMany({ where: { businessId: id }, take: 20, orderBy: { createdAt: "desc" } }),
      this.prisma.systemError.findMany({ where: { businessId: id }, take: 20, orderBy: { lastSeenAt: "desc" } }),
      this.prisma.incident.findMany({ where: { metadata: { path: ["businessId"], equals: id } as any }, take: 10, orderBy: { createdAt: "desc" } }),
      this.prisma.supportTicket.findMany({ where: { businessId: id, status: { in: OPEN_STATUSES } }, take: 20, orderBy: { updatedAt: "desc" } }),
      this.prisma.auditLog.findMany({ where: { businessId: id }, take: 20, orderBy: { createdAt: "desc" } }),
    ]);
    await this.auditAccess(actor, "support_business_viewed", "business", id, dto.reason, dto.ticketId, AuditRiskLevel.MEDIUM);
    return {
      business: { ...this.safeBusiness(business), plan: business.plan?.name, subscription: business.subscription ? { status: business.subscription.status, nextDueAt: business.subscription.nextBillingAt, lastPaymentStatus: business.subscription.lastPaymentStatus } : null },
      administrators: admins.map((row) => ({ role: row.role, status: row.status, user: this.safeUser(row.user) })),
      cashiers: cashiers.map((row) => ({ role: row.role, status: row.status, user: this.safeUser(row.user) })),
      counts: { customers, programs: programs.length, rewards: rewards.length, transactions: transactions.length, openTickets: tickets.length },
      programs,
      rewards,
      transactions,
      errors,
      incidents,
      tickets,
      audit,
      allowedActions: ["add_note", "create_ticket", "send_help_email", "view_configuration", "revoke_user_sessions", "request_reactivation"],
      blockedActions: ["delete_business", "change_plan", "register_payment", "export_database"],
    };
  }

  async user360(id: string, dto: SupportAccessDto, actor: JwtUser) {
    this.assertSupport(actor);
    this.assertReason(dto.reason);
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Usuario no encontrado.");
    const [memberships, cycles, rewards, transactions, sessions, audit, tickets, errors, notes] = await Promise.all([
      this.prisma.customerBusiness.findMany({ where: { customerUserId: id }, include: { business: true }, take: 20 }),
      this.prisma.cycle.findMany({ where: { customerUserId: id }, take: 20, orderBy: { updatedAt: "desc" } }),
      this.prisma.reward.findMany({ where: { customerUserId: id }, take: 20, orderBy: { generatedAt: "desc" } }),
      this.prisma.transaction.findMany({ where: { customerUserId: id }, take: 20, orderBy: { createdAt: "desc" } }),
      this.prisma.authSession.findMany({ where: { userId: id }, take: 20, orderBy: { createdAt: "desc" } }),
      this.prisma.auditLog.findMany({ where: { userId: id }, take: 20, orderBy: { createdAt: "desc" } }),
      this.prisma.supportTicket.findMany({ where: { userId: id }, take: 20, orderBy: { updatedAt: "desc" } }),
      this.prisma.systemError.findMany({ where: { actorUserId: id }, take: 20, orderBy: { lastSeenAt: "desc" } }),
      this.prisma.supportInternalNote.findMany({ where: { subjectType: "user", subjectId: id }, take: 20, orderBy: { createdAt: "desc" } }),
    ]);
    await this.auditAccess(actor, "support_user_viewed", "user", id, dto.reason, dto.ticketId, AuditRiskLevel.HIGH);
    return {
      user: this.safeUser(user),
      account: { status: user.status, locked: Boolean(user.lockedAt), lockedAt: user.lockedAt, deletedAt: user.deletedAt, failedLoginAttempts: user.failedLoginAttempts },
      memberships: memberships.map((row) => ({ status: row.status, business: this.safeBusiness(row.business), joinedAt: row.joinedAt })),
      cycles,
      rewards,
      transactions,
      sessions: sessions.map((session) => ({ id: session.id, createdAt: session.createdAt, lastUsedAt: session.lastUsedAt, expiresAt: session.expiresAt, revokedAt: session.revokedAt, revokedReason: session.revokedReason, deviceLabel: session.deviceLabel, userAgent: this.truncate(session.userAgent ?? "", 120), ipHash: session.ipHash ? "[hash disponible]" : null })),
      audit,
      tickets,
      errors,
      notes,
      allowedActions: ["send_password_reset", "revoke_session", "revoke_all_sessions", "unlock", "create_ticket", "add_note"],
      blockedActions: ["show_password", "show_tokens", "change_role", "delete_user", "manual_points"],
    };
  }

  async cashier360(id: string, dto: SupportAccessDto, actor: JwtUser) {
    const user = await this.user360(id, dto, actor);
    const operations = await this.prisma.transaction.findMany({ where: { performedByUserId: id }, take: 20, orderBy: { createdAt: "desc" } });
    const memberships = await this.prisma.businessUser.findMany({ where: { userId: id }, include: { business: true }, take: 20 });
    return { ...user, cashier: { memberships: memberships.map((row) => ({ role: row.role, status: row.status, business: this.safeBusiness(row.business) })), operations } };
  }

  tickets(status?: string) {
    return this.prisma.supportTicket.findMany({
      where: status && status !== "all" ? { status: status.toUpperCase() as SupportTicketStatus } : undefined,
      include: { timeline: { orderBy: { createdAt: "desc" }, take: 10 }, notes: { orderBy: { createdAt: "desc" }, take: 10 } },
      take: 100,
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    });
  }

  async ticket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id }, include: { timeline: { orderBy: { createdAt: "asc" } }, notes: { orderBy: { createdAt: "desc" } } } });
    if (!ticket) throw new NotFoundException("Ticket no encontrado.");
    return ticket;
  }

  async createTicket(dto: CreateSupportTicketDto, actor: JwtUser) {
    this.assertSupport(actor);
    const sla = await this.slaFor(dto.priority);
    const now = new Date();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ...dto,
        createdById: actor.id,
        assignedAgentId: actor.role === UserRole.SUPPORT ? actor.id : undefined,
        slaFirstResponseDue: new Date(now.getTime() + sla.firstResponseMinutes * 60_000),
        slaResolutionDue: new Date(now.getTime() + sla.resolutionMinutes * 60_000),
        timeline: { create: { type: SupportTimelineType.CREATED, actorId: actor.id, message: "Ticket creado por soporte." } },
      },
      include: { timeline: true, notes: true },
    });
    await this.auditAccess(actor, "support_ticket_created", "support_ticket", ticket.id, dto.description, ticket.id, AuditRiskLevel.MEDIUM);
    return ticket;
  }

  async updateTicket(id: string, dto: UpdateSupportTicketDto, actor: JwtUser) {
    this.assertSupport(actor);
    this.assertReason(dto.reason);
    const before = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Ticket no encontrado.");
    const resolvedAt = dto.status === SupportTicketStatus.RESOLVED && !before.resolvedAt ? new Date() : undefined;
    const closedAt = dto.status === SupportTicketStatus.CLOSED && !before.closedAt ? new Date() : undefined;
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status,
        priority: dto.priority,
        assignedAgentId: dto.assignedAgentId,
        resolvedAt,
        closedAt,
        firstResponseAt: before.firstResponseAt ?? new Date(),
        timeline: { create: { type: SupportTimelineType.STATUS_CHANGED, actorId: actor.id, message: dto.reason, metadata: { from: before.status, to: dto.status, priority: dto.priority } } },
      },
      include: { timeline: { orderBy: { createdAt: "asc" } }, notes: true },
    });
    await this.auditAccess(actor, "support_ticket_updated", "support_ticket", id, dto.reason, id, AuditRiskLevel.MEDIUM);
    return updated;
  }

  async addTicketNote(ticketId: string, note: string, actor: JwtUser) {
    this.assertSupport(actor);
    const safe = this.assertNoSecrets(note);
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket no encontrado.");
    const created = await this.prisma.supportInternalNote.create({
      data: { ticketId, subjectType: "ticket", subjectId: ticketId, authorId: actor.id, body: safe },
    });
    await this.prisma.supportTimelineEvent.create({ data: { ticketId, type: SupportTimelineType.NOTE, actorId: actor.id, message: "Nota interna agregada." } });
    await this.auditAccess(actor, "support_note_added", "support_ticket", ticketId, "nota interna", ticketId, AuditRiskLevel.LOW);
    return created;
  }

  async sendPasswordReset(userId: string, dto: SupportToolDto, actor: JwtUser) {
    this.assertSupport(actor);
    await this.assertActiveTicket(dto.ticketId, "Enviar recuperación requiere ticket activo.");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Usuario no encontrado.");
    await this.auth.requestPasswordReset(user.email, `support:${actor.id}`);
    await this.addTimeline(dto.ticketId!, SupportTimelineType.RESET_SENT, actor.id, "Recuperación de contraseña enviada.");
    await this.auditAccess(actor, "support_password_reset_sent", "user", userId, dto.reason, dto.ticketId, AuditRiskLevel.HIGH);
    return { sent: true };
  }

  async revokeUserSession(userId: string, dto: SupportToolDto, actor: JwtUser) {
    this.assertSupport(actor);
    await this.assertActiveTicket(dto.ticketId, "Revocar sesión requiere ticket activo.");
    if (!dto.sessionId) throw new BadRequestException("sessionId requerido.");
    const result = await this.prisma.authSession.updateMany({ where: { id: dto.sessionId, userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: "support_revoked" } });
    await this.addTimeline(dto.ticketId!, SupportTimelineType.SESSION_REVOKED, actor.id, `Sesión revocada (${result.count}).`);
    await this.auditAccess(actor, "support_session_revoked", "auth_session", dto.sessionId, dto.reason, dto.ticketId, AuditRiskLevel.HIGH);
    return { revoked: result.count };
  }

  async revokeAllUserSessions(userId: string, dto: SupportToolDto, actor: JwtUser) {
    this.assertSupport(actor);
    await this.assertActiveTicket(dto.ticketId, "Revocar sesiones requiere ticket activo.");
    const result = await this.prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: "support_revoked_all" } });
    await this.addTimeline(dto.ticketId!, SupportTimelineType.SESSION_REVOKED, actor.id, `Todas las sesiones revocadas (${result.count}).`);
    await this.auditAccess(actor, "support_all_sessions_revoked", "user", userId, dto.reason, dto.ticketId, AuditRiskLevel.HIGH);
    return { revoked: result.count };
  }

  async unlockUser(userId: string, dto: SupportToolDto, actor: JwtUser) {
    this.assertSupport(actor);
    await this.assertActiveTicket(dto.ticketId, "Desbloquear cuenta requiere ticket activo.");
    const user = await this.prisma.user.update({ where: { id: userId }, data: { lockedAt: null, failedLoginAttempts: 0 } });
    await this.addTimeline(dto.ticketId!, SupportTimelineType.STATUS_CHANGED, actor.id, "Cuenta desbloqueada por soporte.");
    await this.auditAccess(actor, "support_user_unlocked", "user", userId, dto.reason, dto.ticketId, AuditRiskLevel.HIGH);
    return this.safeUser(user);
  }

  async requestLimitedImpersonation(dto: SupportAccessDto, actor: JwtUser) {
    this.assertSupport(actor);
    this.assertReason(dto.reason);
    await this.assertActiveTicket(dto.ticketId, "Impersonation de soporte requiere ticket activo.");
    await this.auditAccess(actor, "support_impersonation_denied_disabled", "support_impersonation", dto.ticketId!, dto.reason, dto.ticketId, AuditRiskLevel.HIGH);
    return { enabled: false, reason: "Impersonation limitada de soporte queda deshabilitada hasta definir aprobación formal y bloqueo UI de acciones sensibles." };
  }

  macros() {
    return this.prisma.supportMacro.findMany({ where: { status: "PUBLISHED" as any }, orderBy: { title: "asc" }, take: 100 });
  }

  knowledgeBase(q = "") {
    return this.prisma.knowledgeArticle.findMany({
      where: { status: "PUBLISHED" as any, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  slaPolicies() {
    return this.prisma.supportSlaPolicy.findMany({ orderBy: { resolutionMinutes: "asc" } });
  }

  private async slaFor(priority: SupportTicketPriority) {
    const found = await this.prisma.supportSlaPolicy.findUnique({ where: { priority } });
    if (found) return found;
    const defaults: Record<SupportTicketPriority, { firstResponseMinutes: number; resolutionMinutes: number }> = {
      CRITICAL: { firstResponseMinutes: 15, resolutionMinutes: 60 },
      HIGH: { firstResponseMinutes: 60, resolutionMinutes: 480 },
      MEDIUM: { firstResponseMinutes: 240, resolutionMinutes: 1440 },
      LOW: { firstResponseMinutes: 1440, resolutionMinutes: 4320 },
    };
    return defaults[priority];
  }

  private async assertActiveTicket(ticketId?: string, message = "Ticket activo requerido.") {
    if (!ticketId) throw new BadRequestException(message);
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket || !OPEN_STATUSES.includes(ticket.status)) throw new BadRequestException(message);
  }

  private assertSupport(actor: JwtUser) {
    if (actor.role !== UserRole.SUPPORT && actor.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException("Rol de soporte requerido.");
  }

  private assertReason(reason?: string) {
    if (!reason || reason.trim().length < 8) throw new BadRequestException("Debes indicar un motivo de acceso de al menos 8 caracteres.");
  }

  private assertNoSecrets(value: string) {
    if (/(api[_-]?key|secret|token|password|contraseÃ±a)\s*[:=]/i.test(value)) {
      throw new BadRequestException("La nota parece contener secretos. Elimínalos antes de guardar.");
    }
    return value.trim();
  }

  private async addTimeline(ticketId: string, type: SupportTimelineType, actorId: string, message: string) {
    return this.prisma.supportTimelineEvent.create({ data: { ticketId, type, actorId, message } });
  }

  private async auditAccess(actor: JwtUser, action: string, entityType: string, entityId: string, reason: string, ticketId?: string, riskLevel: AuditRiskLevel = AuditRiskLevel.MEDIUM) {
    await this.audit.create({
      userId: actor.id,
      action,
      entityType,
      entityId,
      category: "support",
      module: "support",
      riskLevel,
      metadata: { reason: this.truncate(reason, 500), ticketId },
    });
  }

  private safeUser(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: this.maskEmail(user.email),
      phone: this.maskPhone(user.phone),
      rut: this.maskRut(user.rut),
      role: user.role,
      status: user.status,
      lockedAt: user.lockedAt,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      lastAccess: user.updatedAt,
    };
  }

  private safeBusiness(business: any) {
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      businessType: business.businessType,
      rutBusiness: this.maskRut(business.rutBusiness),
      email: this.maskEmail(business.email),
      phone: this.maskPhone(business.phone),
      status: business.status,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }

  private maskEmail(value?: string | null) {
    if (!value) return null;
    const [local, domain] = value.split("@");
    if (!domain) return "[email enmascarado]";
    return `${local.slice(0, 2)}***@${domain}`;
  }

  private maskPhone(value?: string | null) {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
  }

  private maskRut(value?: string | null) {
    if (!value) return null;
    const clean = value.replace(/\s/g, "");
    return clean.length >= 4 ? `***${clean.slice(-4)}` : "***";
  }

  private truncate(value: string, max: number) {
    return value.length > max ? `${value.slice(0, max)}…` : value;
  }
}
