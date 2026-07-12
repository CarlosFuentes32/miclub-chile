import { Injectable } from "@nestjs/common";
import { AuditResult, AuditRiskLevel, Prisma, SystemErrorStatus } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RequestContextService } from "../enterprise-logging/request-context.service";
import { StructuredLoggerService } from "../enterprise-logging/structured-logger.service";
import { csvSafe, hashValue, sanitizeJson, sanitizeText } from "../enterprise-logging/sensitive-data";

export interface AuditInput {
  userId?: string | null;
  businessId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  category?: string;
  module?: string;
  result?: AuditResult | keyof typeof AuditResult | string;
  riskLevel?: AuditRiskLevel | keyof typeof AuditRiskLevel | string;
  previousState?: Prisma.InputJsonValue | null;
  nextState?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue;
  statusCode?: number;
  durationMs?: number;
}

export interface SystemErrorInput {
  error: unknown;
  module?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async create(input: AuditInput, client: Prisma.TransactionClient = this.prisma) {
    const store = this.context.get();
    const request = store?.request;
    const actor = request?.user;
    const ip = request?.ip ?? request?.socket?.remoteAddress;
    const data = {
      userId: input.userId ?? actor?.id ?? null,
      businessId: input.businessId ?? actor?.businessId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      environment: this.logger.environment(),
      actorRole: actor?.role ?? null,
      category: input.category ?? this.categoryForAction(input.action),
      module: input.module ?? this.moduleForAction(input.action),
      result: this.auditResult(input.result),
      riskLevel: this.riskLevel(input.riskLevel),
      previousState: input.previousState ? sanitizeJson(input.previousState) as Prisma.InputJsonValue : undefined,
      nextState: input.nextState ? sanitizeJson(input.nextState) as Prisma.InputJsonValue : undefined,
      requestId: store?.requestId ?? null,
      correlationId: store?.correlationId ?? null,
      endpoint: request?.originalUrl ?? request?.url ?? null,
      method: request?.method ?? null,
      statusCode: input.statusCode ?? undefined,
      durationMs: input.durationMs ?? this.context.durationMs(),
      ipHash: ip ? hashValue(ip) : null,
      userAgent: request?.header("user-agent")?.slice(0, 500) ?? null,
      version: this.logger.version(),
      commit: this.logger.commit(),
      buildNumber: this.logger.buildNumber(),
      metadata: input.metadata ? sanitizeJson(input.metadata) as Prisma.InputJsonValue : undefined,
    };
    const created = await client.auditLog.create({ data });
    this.logger.audit(data.module, input.action, { auditId: created.id, result: data.result, risk: data.riskLevel });
    return created;
  }

  async recordSystemError(input: SystemErrorInput) {
    const store = this.context.get();
    const request = store?.request;
    const actor = request?.user;
    const normalized = this.normalizeError(input.error);
    const endpoint = input.endpoint ?? request?.originalUrl ?? request?.url ?? "unknown";
    const method = input.method ?? request?.method ?? "UNKNOWN";
    const fingerprint = this.fingerprint(normalized.type, input.module ?? "api", endpoint, normalized.message, normalized.stack);
    const environment = this.logger.environment();
    const data = {
      fingerprint,
      environment,
      module: input.module ?? "api",
      type: normalized.type,
      message: normalized.message,
      sanitizedStack: normalized.stack,
      endpoint,
      method,
      statusCode: input.statusCode,
      requestId: store?.requestId,
      correlationId: store?.correlationId,
      actorUserId: actor?.id,
      role: actor?.role,
      businessId: actor?.businessId,
      version: this.logger.version(),
      commit: this.logger.commit(),
      buildNumber: this.logger.buildNumber(),
      metadata: sanitizeJson(input.metadata ?? {}) as Prisma.InputJsonValue,
    };
    const current = await this.prisma.systemError.upsert({
      where: { fingerprint_environment: { fingerprint, environment } },
      update: {
        lastSeenAt: new Date(),
        occurrenceCount: { increment: 1 },
        requestId: data.requestId,
        correlationId: data.correlationId,
        statusCode: data.statusCode,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
      create: data,
    });
    this.logger.error(data.module ?? "api", data.message, {
      errorId: current.id,
      fingerprint,
      occurrenceCount: current.occurrenceCount,
      statusCode: data.statusCode,
    });
    return current;
  }

  async listAudit(filters: Record<string, string>) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const pageSize = Math.min(Math.max(1, Number(filters.pageSize ?? filters.limit ?? 50)), 200);
    const where = this.auditWhere(filters);
    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true, role: true } },
          business: { select: { name: true } },
        },
      }),
    ]);
    return { items, total, page, pageSize };
  }

  async auditDetail(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, role: true } },
        business: { select: { id: true, name: true } },
      },
    });
  }

  async exportAuditCsv(filters: Record<string, string>, actorId: string) {
    const where = this.auditWhere(filters);
    const take = Math.min(Number(filters.limit ?? 1_000), 2_000);
    const rows = await this.prisma.auditLog.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, role: true } },
        business: { select: { name: true } },
      },
    });
    await this.create({
      userId: actorId,
      action: "audit_exported",
      entityType: "audit_log",
      entityId: "export",
      category: "security",
      module: "audit",
      riskLevel: AuditRiskLevel.HIGH,
      metadata: { filters: sanitizeJson(filters), rows: rows.length },
    });
    const header = ["createdAt", "environment", "actor", "role", "business", "action", "category", "module", "result", "risk", "requestId", "correlationId", "endpoint", "statusCode"];
    const lines = [
      header.map(csvSafe).join(","),
      ...rows.map((row) => [
        row.createdAt.toISOString(),
        row.environment,
        row.user?.name ?? "system",
        row.actorRole ?? row.user?.role ?? "",
        row.business?.name ?? "",
        row.action,
        row.category,
        row.module,
        row.result,
        row.riskLevel,
        row.requestId ?? "",
        row.correlationId ?? "",
        row.endpoint ?? "",
        row.statusCode ?? "",
      ].map(csvSafe).join(",")),
    ];
    return {
      filename: `miclub-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      rows: rows.length,
      csv: lines.join("\n"),
      filters: sanitizeJson(filters),
    };
  }

  async listErrors(filters: Record<string, string>) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const pageSize = Math.min(Math.max(1, Number(filters.pageSize ?? filters.limit ?? 50)), 200);
    const where: Prisma.SystemErrorWhereInput = {
      ...(filters.status ? { status: filters.status.toUpperCase() as SystemErrorStatus } : {}),
      ...(filters.environment ? { environment: filters.environment } : {}),
      ...(filters.requestId ? { requestId: filters.requestId } : {}),
      ...(filters.correlationId ? { correlationId: filters.correlationId } : {}),
      ...(filters.endpoint ? { endpoint: { contains: filters.endpoint, mode: "insensitive" } } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.systemError.count({ where }),
      this.prisma.systemError.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { lastSeenAt: "desc" },
      }),
    ]);
    return { items, total, page, pageSize };
  }

  errorDetail(id: string) {
    return this.prisma.systemError.findUnique({ where: { id } });
  }

  async updateErrorStatus(id: string, status: SystemErrorStatus, note: string, actorId: string) {
    const current = await this.prisma.systemError.update({
      where: { id },
      data: {
        status,
        notes: { lastNote: sanitizeText(note, 1_000), updatedBy: actorId, updatedAt: new Date().toISOString() },
      },
    });
    await this.create({
      userId: actorId,
      action: "system_error_status_updated",
      entityType: "system_error",
      entityId: id,
      category: "incidents",
      module: "errors",
      riskLevel: AuditRiskLevel.MEDIUM,
      metadata: { status, note },
    });
    return current;
  }

  retentionDryRun() {
    const now = Date.now();
    const auditDays = Number(process.env.AUDIT_RETENTION_DAYS ?? 365);
    const errorDays = Number(process.env.ERROR_RETENTION_DAYS ?? 180);
    const securityDays = Number(process.env.SECURITY_EVENT_RETENTION_DAYS ?? 730);
    const logDays = Number(process.env.LOG_RETENTION_DAYS ?? 90);
    return {
      mode: "dry-run",
      generatedAt: new Date().toISOString(),
      policy: {
        auditRetentionDays: auditDays,
        errorRetentionDays: errorDays,
        securityEventRetentionDays: securityDays,
        technicalLogRetentionDays: logDays,
      },
      eligibleBefore: {
        audit: new Date(now - auditDays * 86_400_000).toISOString(),
        errors: new Date(now - errorDays * 86_400_000).toISOString(),
        security: new Date(now - securityDays * 86_400_000).toISOString(),
        technicalLogs: new Date(now - logDays * 86_400_000).toISOString(),
      },
      destructiveActionExecuted: false,
    };
  }

  private auditWhere(q: Record<string, string>): Prisma.AuditLogWhereInput {
    return {
      ...(q.action ? { action: { contains: q.action, mode: "insensitive" } } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.module ? { module: q.module } : {}),
      ...(q.result ? { result: q.result.toUpperCase() as AuditResult } : {}),
      ...(q.riskLevel ? { riskLevel: q.riskLevel.toUpperCase() as AuditRiskLevel } : {}),
      ...(q.requestId ? { requestId: q.requestId } : {}),
      ...(q.correlationId ? { correlationId: q.correlationId } : {}),
      ...(q.environment ? { environment: q.environment } : {}),
      ...(q.statusCode ? { statusCode: Number(q.statusCode) } : {}),
      ...(q.role ? { actorRole: q.role } : {}),
      ...(q.user ? { user: { OR: [{ name: { contains: q.user, mode: "insensitive" } }, { email: { contains: q.user, mode: "insensitive" } }] } } : {}),
      ...(q.businessId ? { businessId: q.businessId } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {}),
    };
  }

  private normalizeError(error: unknown) {
    const value = error as { name?: string; message?: string; stack?: string };
    return {
      type: sanitizeText(value?.name ?? "Error", 200) ?? "Error",
      message: sanitizeText(value?.message ?? "No pudimos completar la operación.", 1_000) ?? "No pudimos completar la operación.",
      stack: sanitizeText(value?.stack, 4_000),
    };
  }

  private fingerprint(type: string, module: string, endpoint: string, message: string, stack?: string) {
    const normalizedStack = stack?.split("\n").slice(0, 6).join("\n").replace(/:\d+:\d+/g, ":line:col") ?? "";
    return createHash("sha256").update([type, module, endpoint, message, normalizedStack].join("|")).digest("hex");
  }

  private auditResult(value?: AuditInput["result"]) {
    if (!value) return AuditResult.SUCCESS;
    const key = String(value).toUpperCase() as keyof typeof AuditResult;
    return AuditResult[key] ?? AuditResult.SUCCESS;
  }

  private riskLevel(value?: AuditInput["riskLevel"]) {
    if (!value) return AuditRiskLevel.LOW;
    const key = String(value).toUpperCase() as keyof typeof AuditRiskLevel;
    return AuditRiskLevel[key] ?? AuditRiskLevel.LOW;
  }

  private categoryForAction(action: string) {
    if (/login|logout|password|session|refresh/i.test(action)) return "authentication";
    if (/denied|permission|impersonation|security/i.test(action)) return "security";
    if (/business|subscription|plan|payment/i.test(action)) return "administration";
    if (/program|loyalty/i.test(action)) return "loyalty";
    if (/reward|redeem/i.test(action)) return "rewards";
    if (/transaction|purchase|cashback|stamp|point/i.test(action)) return "transactions";
    if (/backup|restore|rollback/i.test(action)) return "backups";
    if (/incident|error/i.test(action)) return "incidents";
    if (/export/i.test(action)) return "security";
    return "administration";
  }

  private moduleForAction(action: string) {
    if (/login|logout|password|session|refresh/i.test(action)) return "auth";
    if (/business/i.test(action)) return "businesses";
    if (/user|customer|cashier|collaborator/i.test(action)) return "users";
    if (/program|loyalty/i.test(action)) return "loyalty";
    if (/reward|redeem/i.test(action)) return "rewards";
    if (/transaction|purchase/i.test(action)) return "transactions";
    if (/backup|restore|rollback/i.test(action)) return "backups";
    if (/incident/i.test(action)) return "incidents";
    if (/error/i.test(action)) return "errors";
    return "admin";
  }
}
