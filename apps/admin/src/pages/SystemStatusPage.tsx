import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
  GitCommit,
  Globe2,
  HardDrive,
  Mail,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { adminService } from "../services/admin.service";
import { SystemCheck, SystemCheckStatus, SystemStatus } from "../types/admin";

const iconByKey: Record<string, any> = {
  api: Server,
  database: Database,
  prisma: HardDrive,
  connectivity: Globe2,
  variables: ShieldCheck,
  railway: Rocket,
  vercel: Globe2,
  landing: Globe2,
  customer: Smartphone,
  commerce: Activity,
  cashier: Activity,
  admin: ShieldCheck,
  emails: Mail,
  ssl: ShieldCheck,
  lastDeploy: Rocket,
  environment: Globe2,
  commit: GitCommit,
  version: GitBranch,
  buildDate: Clock3,
  playwright: CheckCircle2,
};

const statusStyles: Record<SystemCheckStatus, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
  unknown: "border-slate-200 bg-slate-50 text-slate-700",
};

const dotStyles: Record<SystemCheckStatus, string> = {
  ok: "bg-emerald-500 shadow-emerald-200",
  warning: "bg-amber-500 shadow-amber-200",
  error: "bg-red-500 shadow-red-200",
  unknown: "bg-slate-400 shadow-slate-200",
};

function statusLabel(status: SystemCheckStatus) {
  return {
    ok: "Operativo",
    warning: "Advertencia",
    error: "Error",
    unknown: "Sin dato",
  }[status];
}

function SystemCard({ check }: { check: SystemCheck }) {
  const Icon = iconByKey[check.key] ?? Activity;
  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${statusStyles[check.status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/75">
            <Icon size={22} />
          </span>
          <div>
            <h3 className="font-black">{check.label}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] opacity-70">
              {statusLabel(check.status)}
            </p>
          </div>
        </div>
        <span className={`mt-2 h-3 w-3 rounded-full shadow-lg ${dotStyles[check.status]}`} />
      </div>
      <p className="mt-4 min-h-[48px] text-sm leading-6 opacity-90">{check.message}</p>
      {typeof check.responseTimeMs === "number" && (
        <p className="mt-3 text-xs font-bold opacity-70">{check.responseTimeMs} ms</p>
      )}
    </article>
  );
}

function OverallIcon({ status }: { status: SystemStatus["status"] }) {
  if (status === "ok") return <CheckCircle2 className="text-emerald-300" size={38} />;
  if (status === "down") return <XCircle className="text-red-300" size={38} />;
  return <AlertTriangle className="text-amber-300" size={38} />;
}

export function SystemStatusPage() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await adminService.getSystemStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el estado del sistema");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const orderedChecks = useMemo(() => {
    const checks = Object.values(data?.checks ?? {});
    const order = [
      "api",
      "database",
      "prisma",
      "connectivity",
      "railway",
      "vercel",
      "landing",
      "customer",
      "commerce",
      "cashier",
      "admin",
      "emails",
      "ssl",
      "lastDeploy",
      "environment",
      "commit",
      "version",
      "buildDate",
      "playwright",
      "variables",
    ];
    return checks.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }, [data]);

  if (loading && !data) {
    return <main className="grid min-h-screen place-items-center">Cargando estado del sistema…</main>;
  }

  if (error && !data) {
    return (
      <main className="p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h1 className="text-2xl font-black">Estado del Sistema</h1>
          <p className="mt-2">{error}</p>
          <button className="mt-4 rounded-2xl bg-red-600 px-4 py-2 font-bold text-white" onClick={load}>
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-7 text-white shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Operación SaaS Enterprise</p>
            <h1 className="mt-3 text-4xl font-black">Estado del Sistema</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Observabilidad centralizada para API, base de datos, frontends, emails,
              despliegue, versión y ejecución Playwright.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <div className="flex items-center gap-4">
              <OverallIcon status={data.status} />
              <div>
                <p className="text-sm text-slate-300">Estado global</p>
                <p className="text-2xl font-black uppercase">{data.status}</p>
              </div>
            </div>
            <button
              onClick={load}
              className="mt-5 w-full rounded-2xl bg-white px-4 py-2 text-sm font-black text-violet-900"
            >
              Actualizar
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {(["ok", "warning", "error", "unknown"] as SystemCheckStatus[]).map((status) => (
          <div key={status} className={`rounded-3xl border p-5 ${statusStyles[status]}`}>
            <p className="text-xs font-black uppercase tracking-[0.2em]">{statusLabel(status)}</p>
            <p className="mt-2 text-3xl font-black">{data.summary[status] ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2">
        {orderedChecks.map((check) => (
          <SystemCard key={check.key} check={check} />
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Versión</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-slate-500">Versión</dt><dd className="font-bold">{data.version.version}</dd></div>
            <div><dt className="text-slate-500">Commit</dt><dd className="font-mono text-xs">{data.version.commit}</dd></div>
            <div><dt className="text-slate-500">Build Number</dt><dd className="font-mono text-xs">{data.version.buildNumber}</dd></div>
            <div><dt className="text-slate-500">Build Time</dt><dd>{data.version.buildTime}</dd></div>
          </dl>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Despliegue</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-slate-500">Proveedor</dt><dd className="font-bold">{data.deployment.provider}</dd></div>
            <div><dt className="text-slate-500">Repositorio</dt><dd>{data.deployment.repository}</dd></div>
            <div><dt className="text-slate-500">Rama</dt><dd>{data.deployment.branch}</dd></div>
            <div><dt className="text-slate-500">Ambiente</dt><dd>{data.deployment.environment}</dd></div>
          </dl>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Runtime</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-slate-500">Node</dt><dd className="font-bold">{data.runtime.nodeVersion}</dd></div>
            <div><dt className="text-slate-500">Uptime</dt><dd>{data.runtime.uptimeSeconds}s</dd></div>
            <div><dt className="text-slate-500">Memoria RSS</dt><dd>{data.runtime.memory.rssMb} MB</dd></div>
            <div><dt className="text-slate-500">Respuesta</dt><dd>{data.runtime.responseTimeMs} ms</dd></div>
          </dl>
        </div>
      </section>
    </main>
  );
}
