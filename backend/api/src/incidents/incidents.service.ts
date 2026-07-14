import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  IncidentActionType,
  IncidentAlertChannel,
  IncidentSeverity,
  IncidentStatus,
  UserRole,
} from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { ObservabilityService } from "../observability/observability.service";
import { SystemCheck } from "../observability/observability.types";

type MonitorSource = "scheduled-monitor" | "manual-simulation" | "health-evaluation";

export interface IncidentInput {
  service: string;
  title: string;
  severity: IncidentSeverity;
  summary: string;
  technicalDetail?: string;
  source: MonitorSource | string;
  metadata?: Record<string, unknown>;
}

const OPEN_STATUSES: IncidentStatus[] = [
  IncidentStatus.DETECTED,
  IncidentStatus.INVESTIGATING,
  IncidentStatus.IDENTIFIED,
  IncidentStatus.MONITORING,
];

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly observability: ObservabilityService,
  ) {}

  async list(filters: Record<string, string>) {
    const where: any = {};
    if (filters.environment) where.environment = filters.environment;
    if (filters.service) where.service = filters.service;
    if (filters.severity) where.severity = filters.severity.toUpperCase();
    if (filters.status) where.status = filters.status.toUpperCase();
    return this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(filters.limit ?? 100), 200),
      include: {
        actions: { orderBy: { createdAt: "desc" }, take: 3 },
        alerts: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });
  }

  async detail(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        actions: { orderBy: { createdAt: "asc" } },
        alerts: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!incident) throw new NotFoundException("Incidente no encontrado");
    return incident;
  }

  async updateStatus(id: string, status: IncidentStatus, actorUserId: string, note?: string) {
    const previous = await this.detail(id);
    const now = new Date();
    const data: any = { status };
    if (status === IncidentStatus.RESOLVED) {
      data.recoveredAt = previous.recoveredAt ?? now;
      data.closedAt = now;
      data.finalStatus = "resolved_by_admin";
      data.durationSeconds = Math.max(0, Math.round((now.getTime() - previous.startedAt.getTime()) / 1000));
    }
    const updated = await this.prisma.incident.update({ where: { id }, data });
    await this.action(id, IncidentActionType.STATUS_CHANGED, actorUserId, note ?? `Estado actualizado a ${status}`, {
      previousStatus: previous.status,
      newStatus: status,
    });
    if (status === IncidentStatus.RESOLVED) await this.sendRecoveryAlert(updated.id);
    return this.detail(updated.id);
  }

  async addNote(id: string, actorUserId: string, note: string) {
    await this.detail(id);
    await this.action(id, IncidentActionType.NOTE_ADDED, actorUserId, this.sanitizeText(note), {});
    return this.detail(id);
  }

  async runMonitoring(source: MonitorSource = "scheduled-monitor") {
    const health = await this.observability.getEnterpriseHealth();
    const failures = Object.values(health.checks).filter((check) => check.status === "error" || check.status === "warning");
    const createdOrUpdated = [];

    for (const check of failures) {
      const severity = this.severityForCheck(check);
      if (!severity) continue;
      createdOrUpdated.push(
        await this.createOrUpdateIncident({
          service: check.key,
          title: `${check.label}: ${check.status === "error" ? "falla detectada" : "degradación detectada"}`,
          severity,
          summary: check.message,
          technicalDetail: this.sanitizeText(JSON.stringify(check.metadata ?? {})),
          source,
          metadata: { status: check.status, responseTimeMs: check.responseTimeMs ?? null },
        }),
      );
    }

    const healthyKeys = new Set(
      Object.values(health.checks)
        .filter((check) => check.status === "ok")
        .map((check) => this.dedupeKey(check.key, health.environment)),
    );
    const recovered = await this.resolveRecovered(healthyKeys, source);

    return {
      status: health.status,
      evaluatedAt: health.timestamp,
      failures: failures.length,
      incidents: createdOrUpdated,
      recovered,
      environment: health.environment,
      version: health.version,
    };
  }

  async createOrUpdateIncident(input: IncidentInput) {
    const environment = this.config.get<string>("APP_ENV") ?? this.config.get<string>("NODE_ENV", "development");
    const version = this.config.get<string>("RELEASE_VERSION") ?? this.config.get<string>("APP_VERSION") ?? "unknown";
    const commit = this.config.get<string>("RELEASE_COMMIT")
      ?? this.config.get<string>("RAILWAY_GIT_COMMIT_SHA")
      ?? this.config.get<string>("GIT_COMMIT_SHA")
      ?? "unknown";
    const dedupeKey = this.dedupeKey(input.service, environment);
    const existing = await this.prisma.incident.findFirst({
      where: { dedupeKey, environment, status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      const updated = await this.prisma.incident.update({
        where: { id: existing.id },
        data: {
          title: this.sanitizeRequiredText(input.title),
          severity: input.severity,
          summary: this.sanitizeRequiredText(input.summary),
          technicalDetail: this.sanitizeText(input.technicalDetail),
          metadata: this.sanitizeJson(input.metadata ?? {}),
        },
      });
      await this.action(updated.id, IncidentActionType.DETECTED, undefined, "Incidente deduplicado/actualizado por monitor", {
        source: input.source,
      });
      await this.sendDetectionAlert(updated.id);
      return this.detail(updated.id);
    }

    const created = await this.prisma.incident.create({
      data: {
        dedupeKey,
        title: this.sanitizeRequiredText(input.title),
        service: input.service,
        environment,
        severity: input.severity,
        status: IncidentStatus.DETECTED,
        deployedVersion: version,
        commit,
        summary: this.sanitizeRequiredText(input.summary),
        technicalDetail: this.sanitizeText(input.technicalDetail),
        source: input.source,
        metadata: this.sanitizeJson(input.metadata ?? {}),
        actions: {
          create: {
            action: IncidentActionType.DETECTED,
            note: "Incidente creado por monitor",
            metadata: { source: input.source },
          },
        },
      },
    });
    await this.sendDetectionAlert(created.id);
    return this.detail(created.id);
  }

  async simulate(service: string, severity: IncidentSeverity, actorUserId: string) {
    this.assertStagingSimulationAllowed();
    const incident = await this.createOrUpdateIncident({
      service,
      title: `Simulación segura: ${service}`,
      severity,
      summary: "Incidente simulado en staging para validar alertas y recuperación",
      technicalDetail: "simulation=staging_safe",
      source: "manual-simulation",
      metadata: { simulation: true, actorUserId },
    });
    await this.action(incident.id, IncidentActionType.NOTE_ADDED, actorUserId, "Simulación segura iniciada desde Super Admin", {});
    return incident;
  }

  async resolveSimulation(service: string, actorUserId: string) {
    this.assertStagingSimulationAllowed();
    const environment = this.config.get<string>("APP_ENV") ?? this.config.get<string>("NODE_ENV", "development");
    const incident = await this.prisma.incident.findFirst({
      where: {
        dedupeKey: this.dedupeKey(service, environment),
        environment,
        status: { in: OPEN_STATUSES },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!incident) throw new NotFoundException("No hay simulación abierta para ese servicio");
    return this.updateStatus(incident.id, IncidentStatus.RESOLVED, actorUserId, "Simulación segura restaurada");
  }

  private async resolveRecovered(healthyDedupeKeys: Set<string>, source: MonitorSource) {
    const environment = this.config.get<string>("APP_ENV") ?? this.config.get<string>("NODE_ENV", "development");
    const open = await this.prisma.incident.findMany({
      where: { environment, status: { in: OPEN_STATUSES } },
    });
    const recovered = [];
    for (const incident of open) {
      if (!healthyDedupeKeys.has(incident.dedupeKey)) continue;
      const now = new Date();
      const updated = await this.prisma.incident.update({
        where: { id: incident.id },
        data: {
          status: IncidentStatus.RESOLVED,
          recoveredAt: now,
          closedAt: now,
          finalStatus: "auto_recovered",
          durationSeconds: Math.max(0, Math.round((now.getTime() - incident.startedAt.getTime()) / 1000)),
        },
      });
      await this.action(updated.id, IncidentActionType.RECOVERY_DETECTED, undefined, "Recuperación detectada automáticamente", { source });
      await this.sendRecoveryAlert(updated.id);
      recovered.push(updated);
    }
    return recovered;
  }

  private async sendDetectionAlert(id: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) return;
    const alertable: IncidentSeverity[] = [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH];
    if (!alertable.includes(incident.severity)) return;
    const now = new Date();
    if (incident.alertCooldownUntil && incident.alertCooldownUntil > now) {
      await this.action(id, IncidentActionType.ALERT_SUPPRESSED, undefined, "Alerta suprimida por cooldown", {});
      return;
    }
    const result = await this.sendEmailAlert(incident, "detected");
    const cooldownMinutes = Number(this.config.get<string>("ALERT_COOLDOWN_MINUTES", "30"));
    await this.prisma.incident.update({
      where: { id },
      data: {
        lastAlertAt: now,
        alertCooldownUntil: new Date(now.getTime() + cooldownMinutes * 60_000),
      },
    });
    await this.recordAlert(id, IncidentAlertChannel.EMAIL, result.sent ? "sent" : result.skipped ? "skipped" : "failed", result.reason, result.providerId);
    await this.action(id, result.sent ? IncidentActionType.ALERT_SENT : IncidentActionType.ALERT_SUPPRESSED, undefined, "Alerta de detección procesada", {
      channel: "email",
      sent: result.sent,
      reason: result.reason,
    });
    await this.sendSlackAlert(incident, "detected");
  }

  private async sendRecoveryAlert(id: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) return;
    const result = await this.sendEmailAlert(incident, "recovered");
    await this.recordAlert(id, IncidentAlertChannel.EMAIL, result.sent ? "sent" : result.skipped ? "skipped" : "failed", result.reason, result.providerId);
    await this.action(id, result.sent ? IncidentActionType.ALERT_SENT : IncidentActionType.ALERT_SUPPRESSED, undefined, "Alerta de recuperación procesada", {
      channel: "email",
      sent: result.sent,
      reason: result.reason,
    });
    await this.sendSlackAlert(incident, "recovered");
  }

  private async sendEmailAlert(incident: any, type: "detected" | "recovered") {
    const to = this.config.get<string>("ALERT_EMAIL") ?? this.config.get<string>("ADMIN_ALERT_EMAIL");
    if (!to) return { sent: false, skipped: true, reason: "alert_email_not_configured" };
    const title = type === "detected"
      ? `[${incident.severity}] Incidente detectado: ${incident.service}`
      : `Servicio recuperado: ${incident.service}`;
    const panelUrl = `${this.config.get<string>("ADMIN_APP_URL", "https://admin.miclubchile.cl")}/#/system-status`;
    return this.email.adminNotice(to, "Equipo MiClub", title, incident.summary, [
      { label: "Servicio", value: incident.service },
      { label: "Ambiente", value: incident.environment },
      { label: "Severidad", value: incident.severity },
      { label: "Estado", value: incident.status },
      { label: "Versión", value: incident.deployedVersion ?? "unknown" },
      { label: "Commit", value: incident.commit ?? "unknown" },
      { label: "Panel", value: panelUrl },
    ]);
  }

  private async sendSlackAlert(incident: any, type: "detected" | "recovered") {
    const url = this.config.get<string>("ALERT_SLACK_WEBHOOK_URL");
    if (!url) return;
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${type === "detected" ? "🚨" : "✅"} ${incident.environment} · ${incident.service} · ${incident.severity}: ${incident.summary}`,
        }),
      });
      await this.recordAlert(incident.id, IncidentAlertChannel.SLACK, "sent", undefined, undefined);
    } catch {
      await this.recordAlert(incident.id, IncidentAlertChannel.SLACK, "failed", "provider_unavailable", undefined);
    }
  }

  private async recordAlert(id: string, channel: IncidentAlertChannel, status: string, message?: string, providerId?: string) {
    const recipient = channel === IncidentAlertChannel.EMAIL
      ? this.config.get<string>("ALERT_EMAIL") ?? this.config.get<string>("ADMIN_ALERT_EMAIL")
      : undefined;
    await this.prisma.incidentAlert.create({
      data: {
        incidentId: id,
        channel,
        status,
        recipient: recipient ? this.sanitizeEmail(recipient) : undefined,
        message: this.sanitizeText(message),
        providerId,
        sentAt: status === "sent" ? new Date() : undefined,
      },
    });
  }

  private async action(id: string, action: IncidentActionType, actorUserId?: string, note?: string, metadata?: Record<string, unknown>) {
    await this.prisma.incidentAction.create({
      data: {
        incidentId: id,
        actorUserId,
        action,
        note: this.sanitizeText(note),
        metadata: this.sanitizeJson(metadata ?? {}),
      },
    });
  }

  private severityForCheck(check: SystemCheck): IncidentSeverity | null {
    if (check.status === "ok" || check.status === "unknown") return null;
    if (["api", "database", "prisma", "connectivity"].includes(check.key) && check.status === "error") return IncidentSeverity.CRITICAL;
    if (["landing", "customer", "commerce", "cashier", "admin", "emails"].includes(check.key) && check.status === "error") return IncidentSeverity.HIGH;
    if (check.key === "ssl" && check.status === "warning") return IncidentSeverity.MEDIUM;
    if (check.key === "variables" && check.status === "error") return IncidentSeverity.CRITICAL;
    return check.status === "error" ? IncidentSeverity.HIGH : IncidentSeverity.MEDIUM;
  }

  private dedupeKey(service: string, environment: string) {
    return `${environment}:${service}`.toLowerCase().replace(/[^a-z0-9:_-]/g, "_");
  }

  private assertStagingSimulationAllowed() {
    const env = this.config.get<string>("APP_ENV") ?? this.config.get<string>("NODE_ENV");
    if (env !== "staging") throw new ForbiddenException("La simulación de incidentes solo está habilitada en staging");
  }

  private sanitizeText(value?: string | null) {
    if (!value) return undefined;
    return value
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
      .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgres://[redacted]")
      .replace(/(api[_-]?key|token|secret|password|cookie)=([^&\s]+)/gi, "$1=[redacted]")
      .slice(0, 2_000);
  }

  private sanitizeRequiredText(value: string) {
    return this.sanitizeText(value) ?? "";
  }

  private sanitizeEmail(value: string) {
    const [name, domain] = value.split("@");
    if (!domain) return "[redacted]";
    return `${name.slice(0, 2)}…@${domain}`;
  }

  private sanitizeJson(value: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(value, (key, val) => {
      if (/password|token|secret|cookie|authorization|database_url/i.test(key)) return "[redacted]";
      if (typeof val === "string") return this.sanitizeText(val);
      return val;
    }));
  }
}
