import { IncidentSeverity, IncidentStatus } from "@prisma/client";
import { IncidentsService } from "../backend/api/src/incidents/incidents.service";

type Env = Record<string, string | undefined>;
type IncidentRow = any;
type ActionRow = any;
type AlertRow = any;

class FakeConfig {
  constructor(private readonly env: Env) {}
  get<T = string>(key: string, fallback?: T): T {
    return (this.env[key] ?? fallback) as T;
  }
}

class FakeEmail {
  public calls: Array<{ to: string; title: string; intro: string }> = [];
  async adminNotice(to: string, _name: string, title: string, intro: string) {
    this.calls.push({ to, title, intro });
    return { sent: true, providerId: `email-${this.calls.length}` };
  }
}

class FakeObservability {
  private degraded = true;
  setRecovered() {
    this.degraded = false;
  }
  async getEnterpriseHealth() {
    if (this.degraded) {
      return {
        status: "degraded",
        timestamp: new Date().toISOString(),
        environment: "staging",
        version: { version: "1.1.0-test" },
        checks: {
          api: { key: "api", label: "API", status: "error", message: "API no responde", responseTimeMs: 900 },
          database: { key: "database", label: "Base de datos", status: "ok", message: "OK" },
        },
      };
    }
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: "staging",
      version: { version: "1.1.0-test" },
      checks: {
        api: { key: "api", label: "API", status: "ok", message: "OK", responseTimeMs: 20 },
        database: { key: "database", label: "Base de datos", status: "ok", message: "OK" },
      },
    };
  }
}

class FakePrisma {
  incidents: IncidentRow[] = [];
  actions: ActionRow[] = [];
  alerts: AlertRow[] = [];

  incident = {
    findMany: async (args: any = {}) => this.findMany(args),
    findFirst: async (args: any = {}) => this.findMany(args)[0] ?? null,
    findUnique: async (args: any = {}) => this.withIncludes(this.incidents.find((item) => item.id === args.where.id) ?? null, args),
    create: async (args: any = {}) => this.createIncident(args.data),
    update: async (args: any = {}) => this.updateIncident(args.where.id, args.data),
  };

  incidentAction = {
    create: async (args: any = {}) => {
      const row = {
        id: `act-${this.actions.length + 1}`,
        createdAt: new Date(),
        ...args.data,
      };
      this.actions.push(row);
      return row;
    },
  };

  incidentAlert = {
    create: async (args: any = {}) => {
      const row = {
        id: `alert-${this.alerts.length + 1}`,
        createdAt: new Date(),
        ...args.data,
      };
      this.alerts.push(row);
      return row;
    },
  };

  private findMany(args: any = {}) {
    let rows = [...this.incidents];
    const where = args.where ?? {};
    if (where.environment) rows = rows.filter((item) => item.environment === where.environment);
    if (where.service) rows = rows.filter((item) => item.service === where.service);
    if (where.severity) rows = rows.filter((item) => item.severity === where.severity);
    if (where.status?.in) rows = rows.filter((item) => where.status.in.includes(item.status));
    else if (where.status) rows = rows.filter((item) => item.status === where.status);
    if (where.dedupeKey) rows = rows.filter((item) => item.dedupeKey === where.dedupeKey);
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return rows.slice(0, args.take ?? rows.length).map((item) => this.withIncludes(item, args));
  }

  private createIncident(data: any) {
    const now = new Date();
    const row = {
      id: `inc-${this.incidents.length + 1}`,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    this.incidents.push(row);
    if (data.actions?.create) {
      this.actions.push({
        id: `act-${this.actions.length + 1}`,
        incidentId: row.id,
        createdAt: now,
        ...data.actions.create,
      });
    }
    return row;
  }

  private updateIncident(id: string, data: any) {
    const row = this.incidents.find((item) => item.id === id);
    if (!row) throw new Error("not found");
    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  }

  private withIncludes(row: IncidentRow | null, args: any) {
    if (!row) return null;
    const result = { ...row };
    if (args.include?.actions) {
      result.actions = this.actions
        .filter((item) => item.incidentId === row.id)
        .sort((a, b) => {
          const dir = args.include.actions.orderBy?.createdAt === "asc" ? 1 : -1;
          return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
        })
        .slice(0, args.include.actions.take ?? undefined);
    }
    if (args.include?.alerts) {
      result.alerts = this.alerts
        .filter((item) => item.incidentId === row.id)
        .sort((a, b) => {
          const dir = args.include.alerts.orderBy?.createdAt === "asc" ? 1 : -1;
          return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
        })
        .slice(0, args.include.alerts.take ?? undefined);
    }
    return result;
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function service(env: Env = {}) {
  const prisma = new FakePrisma();
  const email = new FakeEmail();
  const observability = new FakeObservability();
  const incidents = new IncidentsService(
    prisma as any,
    new FakeConfig({
      APP_ENV: "staging",
      NODE_ENV: "staging",
      ALERT_EMAIL: "qa-alerts@miclubchile.cl",
      ALERT_COOLDOWN_MINUTES: "30",
      APP_VERSION: "1.1.0-test",
      RAILWAY_GIT_COMMIT_SHA: "abcdef1234567890",
      ADMIN_APP_URL: "https://staging-admin.miclubchile.cl",
      ...env,
    }) as any,
    email as any,
    observability as any,
  );
  return { incidents, prisma, email, observability };
}

async function run() {
  const ctx = service();

  const monitoring = await ctx.incidents.runMonitoring();
  assert(monitoring.failures === 1, "Debe detectar servicio degradado");
  assert(ctx.prisma.incidents.length === 1, "Debe crear un incidente");
  assert(ctx.prisma.incidents[0].status === IncidentStatus.DETECTED, "Incidente debe iniciar como DETECTED");
  assert(ctx.prisma.incidents[0].severity === IncidentSeverity.CRITICAL, "API caída debe ser CRITICAL");
  assert(ctx.email.calls.length === 1, "Debe enviar alerta crítica por email");
  assert(ctx.prisma.alerts.length === 1, "Debe registrar alerta enviada");

  await ctx.incidents.runMonitoring();
  assert(ctx.prisma.incidents.length === 1, "Debe deduplicar el incidente abierto");
  assert(ctx.email.calls.length === 1, "Cooldown debe evitar correo duplicado");
  assert(ctx.prisma.actions.some((a) => a.action === "ALERT_SUPPRESSED"), "Debe auditar alerta suprimida por cooldown");

  const filtered = await ctx.incidents.list({ status: "detected", severity: "critical" });
  assert(filtered.length === 1, "Debe filtrar incidentes por estado y severidad");

  const updated = await ctx.incidents.updateStatus(ctx.prisma.incidents[0].id, IncidentStatus.INVESTIGATING, "admin-1", "Revisando logs");
  assert(updated.status === IncidentStatus.INVESTIGATING, "Debe actualizar estado del incidente");
  assert(updated.actions.some((a: any) => a.note === "Revisando logs"), "Debe registrar acción del administrador");

  ctx.observability.setRecovered();
  const recovered = await ctx.incidents.runMonitoring();
  assert(recovered.recovered.length === 1, "Debe detectar recuperación");
  assert(ctx.prisma.incidents[0].status === IncidentStatus.RESOLVED, "Debe cerrar incidente recuperado");
  assert(ctx.email.calls.length === 2, "Debe enviar alerta de recuperación");

  const simulation = await ctx.incidents.simulate("emails", IncidentSeverity.HIGH, "admin-1");
  assert(simulation.service === "emails", "Debe crear simulación staging");
  await ctx.incidents.resolveSimulation("emails", "admin-1");
  assert(
    ctx.prisma.incidents.find((item) => item.service === "emails")?.status === IncidentStatus.RESOLVED,
    "Debe resolver simulación staging",
  );

  const prodCtx = service({ APP_ENV: "production", NODE_ENV: "production" });
  await prodCtx.incidents.simulate("api", IncidentSeverity.HIGH, "admin-1")
    .then(() => {
      throw new Error("La simulación no debe permitirse en producción");
    })
    .catch((error) => {
      assert(error?.status === 403, "Simulación fuera de staging debe devolver Forbidden");
    });

  console.log("OK: monitoreo, incidentes, deduplicación, alertas, cooldown, recuperación y simulación staging verificados");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
