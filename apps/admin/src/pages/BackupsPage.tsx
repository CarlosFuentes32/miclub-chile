import { useEffect, useState } from "react";
import { Archive, CheckCircle2, DatabaseBackup, History, RotateCcw, ShieldAlert, XCircle } from "lucide-react";
import { adminService } from "../services/admin.service";
import { BackupOverview, BackupRecord, RestoreRecord, RollbackPlan } from "../types/admin";

const statusStyles: Record<string, string> = {
  VERIFIED: "bg-emerald-100 text-emerald-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  RUNNING: "bg-cyan-100 text-cyan-800",
  VALIDATING: "bg-cyan-100 text-cyan-800",
  REQUESTED: "bg-slate-100 text-slate-800",
  PLANNED: "bg-violet-100 text-violet-800",
  FAILED: "bg-red-100 text-red-800",
  BLOCKED: "bg-red-100 text-red-800",
  EXPIRED: "bg-amber-100 text-amber-800",
};

function dateTime(value?: string) {
  if (!value) return "Sin dato";
  return new Date(value).toLocaleString("es-CL");
}

function duration(ms?: number) {
  if (typeof ms !== "number") return "Sin dato";
  if (ms < 1000) return `${ms} ms`;
  return `${Math.round(ms / 100) / 10}s`;
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[status ?? ""] ?? "bg-slate-100 text-slate-700"}`}>
      {status ?? "Sin dato"}
    </span>
  );
}

function BackupCard({ backup }: { backup?: BackupRecord }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-800">
            <DatabaseBackup />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Último backup</p>
            <h2 className="text-xl font-black">{backup ? backup.type : "Sin backups"}</h2>
          </div>
        </div>
        <StatusBadge status={backup?.status} />
      </div>
      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div><dt className="text-slate-500">Fecha</dt><dd className="font-bold">{dateTime(backup?.startedAt)}</dd></div>
        <div><dt className="text-slate-500">Duración</dt><dd className="font-bold">{duration(backup?.durationMs)}</dd></div>
        <div><dt className="text-slate-500">Ambiente</dt><dd className="font-bold">{backup?.environment ?? "Sin dato"}</dd></div>
        <div><dt className="text-slate-500">Base</dt><dd className="font-bold">{backup?.databaseName ?? "Sin dato"}</dd></div>
        <div><dt className="text-slate-500">Versión</dt><dd>{backup?.version ?? "Sin dato"}</dd></div>
        <div><dt className="text-slate-500">Commit</dt><dd className="font-mono text-xs">{backup?.commit?.slice(0, 12) ?? "Sin dato"}</dd></div>
        <div className="md:col-span-2"><dt className="text-slate-500">Resultado</dt><dd>{backup?.result ?? "Sin dato"}</dd></div>
      </dl>
    </article>
  );
}

function RestoreCard({ restore }: { restore?: RestoreRecord }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-100 text-cyan-800">
            <Archive />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Última restauración</p>
            <h2 className="text-xl font-black">Restore drill</h2>
          </div>
        </div>
        <StatusBadge status={restore?.status} />
      </div>
      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div><dt className="text-slate-500">Fecha</dt><dd className="font-bold">{dateTime(restore?.startedAt)}</dd></div>
        <div><dt className="text-slate-500">Tiempo</dt><dd className="font-bold">{duration(restore?.durationMs)}</dd></div>
        <div><dt className="text-slate-500">Base utilizada</dt><dd>{restore?.temporaryDatabaseRef ?? "Sin dato"}</dd></div>
        <div><dt className="text-slate-500">Ambiente destino</dt><dd>{restore?.targetEnvironment ?? "Sin dato"}</dd></div>
        <div className="md:col-span-2"><dt className="text-slate-500">Validación</dt><dd>{restore?.result ?? "Sin dato"}</dd></div>
      </dl>
    </article>
  );
}

function BackupRow({ backup }: { backup: BackupRecord }) {
  const validation = backup.validation as any;
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3 font-mono text-xs">{backup.id.slice(0, 10)}</td>
      <td className="px-4 py-3">{dateTime(backup.startedAt)}</td>
      <td className="px-4 py-3">{backup.type}</td>
      <td className="px-4 py-3"><StatusBadge status={backup.status} /></td>
      <td className="px-4 py-3">{backup.environment}</td>
      <td className="px-4 py-3 font-mono text-xs">{backup.commit?.slice(0, 10)}</td>
      <td className="px-4 py-3">{validation?.ok ? <CheckCircle2 className="text-emerald-600" /> : <XCircle className="text-red-600" />}</td>
      <td className="px-4 py-3">{backup.result}</td>
    </tr>
  );
}

export function BackupsPage() {
  const [data, setData] = useState<BackupOverview | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await adminService.getBackupOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar backups");
    } finally {
      setLoading(false);
    }
  }

  async function action(label: string, fn: () => Promise<unknown>) {
    setMessage("");
    setError("");
    try {
      await fn();
      setMessage(`${label} ejecutado correctamente.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo ejecutar ${label}`);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading && !data) return <main className="grid min-h-screen place-items-center">Cargando backups...</main>;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-7 text-white shadow-2xl">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Continuidad operacional</p>
        <h1 className="mt-3 text-4xl font-black">Backups, Restore y Rollback</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Catálogo Enterprise para respaldos, validaciones de integridad, restauraciones seguras en base temporal y planes de rollback.
          No muestra contraseñas, tokens ni URLs sensibles.
        </p>
      </section>

      {(message || error) && (
        <div className={`mt-5 rounded-2xl p-4 text-sm font-bold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <BackupCard backup={data?.lastBackup} />
        <RestoreCard restore={data?.lastRestore} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-4">
        <button
          className="rounded-3xl bg-violet-700 p-5 text-left font-black text-white shadow-lg"
          onClick={() => action("Backup manual", () => adminService.createBackup({ type: "MANUAL", reason: "Backup manual desde Super Admin" }))}
        >
          <DatabaseBackup className="mb-3" /> Crear backup manual
        </button>
        <button
          className="rounded-3xl bg-slate-900 p-5 text-left font-black text-white shadow-lg"
          onClick={() => action("Validación", () => adminService.validateLatestBackup())}
        >
          <CheckCircle2 className="mb-3" /> Validar último backup
        </button>
        <button
          className="rounded-3xl bg-cyan-700 p-5 text-left font-black text-white shadow-lg"
          onClick={() => action("Restore drill", () => adminService.createRestoreDrill({
            backupId: data?.lastBackup?.id,
            targetEnvironment: "temporary",
            temporaryDatabaseRef: "super-admin-temporary-restore",
            reason: "Restore drill desde Super Admin",
            confirmedTemporaryRestore: true,
          }))}
        >
          <History className="mb-3" /> Probar restore seguro
        </button>
        <button
          className="rounded-3xl bg-amber-600 p-5 text-left font-black text-white shadow-lg"
          onClick={() => action("Simulación", () => adminService.simulateBackupRecovery())}
        >
          <RotateCcw className="mb-3" /> Simulación completa
        </button>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-violet-700" />
          <div>
            <h2 className="text-xl font-black">Política de restore</h2>
            <p className="text-sm text-slate-500">{data?.strategy.restorePolicy}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <p className="rounded-2xl bg-slate-50 p-4">{data?.strategy.providerBackups}</p>
          <p className="rounded-2xl bg-slate-50 p-4">{data?.strategy.appCatalog}</p>
          <button
            className="rounded-2xl border border-slate-300 p-4 text-left font-bold text-slate-700"
            onClick={() => action("Plan de rollback", () => adminService.createRollbackPlan({
              reason: "Plan preventivo generado desde Super Admin",
              backupId: data?.lastBackup?.id,
              toCommit: data?.lastBackup?.commit?.slice(0, 40),
              includeDatabase: Boolean(data?.lastBackup?.id),
              includeVariables: true,
            }))}
          >
            Crear plan de rollback validado
          </button>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-black">Historial de backups</h2>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Ambiente</th>
                <th className="px-4 py-3">Commit</th>
                <th className="px-4 py-3">Integridad</th>
                <th className="px-4 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {(data?.backups ?? []).map((backup) => <BackupRow key={backup.id} backup={backup} />)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Restores recientes</h2>
          <div className="mt-4 space-y-3">
            {(data?.restores ?? []).map((restore) => (
              <div key={restore.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-3"><b>{restore.targetEnvironment}</b><StatusBadge status={restore.status} /></div>
                <p className="mt-2 text-slate-600">{restore.result}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Rollback</h2>
          <div className="mt-4 space-y-3">
            {(data?.rollbacks ?? []).map((rollback: RollbackPlan) => (
              <div key={rollback.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-3"><b>{rollback.reason}</b><StatusBadge status={rollback.status} /></div>
                <p className="mt-2 font-mono text-xs text-slate-500">{rollback.fromCommit?.slice(0, 12)} → {rollback.toCommit?.slice(0, 12) ?? "manual"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
