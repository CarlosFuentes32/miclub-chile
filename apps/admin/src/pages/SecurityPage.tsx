import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { AuditLog, SecurityDashboard } from "../types/admin";

const cards: Array<[keyof SecurityDashboard["summary"], string]> = [
  ["failedLogins", "Login fallidos"],
  ["denied", "Accesos denegados"],
  ["lockedUsers", "Cuentas bloqueadas"],
  ["activeSessions", "Sesiones activas"],
  ["revokedSessions", "Sesiones revocadas"],
  ["impersonations", "Impersonations"],
  ["exports", "Exportaciones"],
  ["rateLimits", "Rate limits"],
];

const riskStyle: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const resultStyle: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  FAILURE: "bg-red-100 text-red-700",
  DENIED: "bg-amber-100 text-amber-700",
  PARTIAL: "bg-cyan-100 text-cyan-700",
};

function pillClass(map: Record<string, string>, value?: string | null) {
  return map[(value ?? "").toUpperCase()] ?? "bg-slate-100 text-slate-600";
}

function compactId(value?: string | null) {
  if (!value) return "—";
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function DetailLine({ label, value, mono = false }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <p className="min-w-0 text-sm">
      <span className="block text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`break-words font-semibold text-slate-700 ${mono ? "font-mono text-xs" : ""}`}>{value ? String(value) : "—"}</span>
    </p>
  );
}

export function SecurityPage() {
  const [data, setData] = useState<SecurityDashboard | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditLog | null>(null);
  const [message, setMessage] = useState("");
  async function load() {
    setData(await adminService.getSecurityDashboard());
  }
  async function revokeSession(id: string) {
    const result = await adminService.revokeSecuritySession(id);
    setMessage(`Sesiones revocadas: ${result.revoked}`);
    await load();
  }
  async function revokeAll(userId: string) {
    const result = await adminService.revokeUserSessions(userId);
    setMessage(`Sesiones del usuario revocadas: ${result.revoked}`);
    await load();
  }
  useEffect(() => {
    void load();
  }, []);
  if (!data) return <main className="page">Cargando seguridad…</main>;
  return (
    <main className="page">
      <p className="eyebrow">Seguridad Enterprise</p>
      <h1 className="title">Sesiones, permisos y protección operativa</h1>
      <p className="subtitle">Monitorea accesos, sesiones, rate limits, exportaciones e impersonations desde un único módulo Super Admin.</p>
      {message && <p className="mt-4 rounded-2xl bg-emerald-100 p-4 font-bold text-emerald-700">{message}</p>}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([key, label]) => (
          <article key={key} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="break-words text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{data.summary[key]}</p>
          </article>
        ))}
      </section>
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Configuración activa</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.securityConfiguration).map(([key, enabled]) => (
            <span key={key} className={`min-w-0 whitespace-normal break-words rounded-full px-4 py-2 text-sm font-black ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {enabled ? "✓" : "!"} {key}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white">
        <div className="p-5"><h2 className="text-xl font-black">Sesiones recientes</h2></div>
        <div className="grid gap-4 p-5 pt-0 lg:hidden">
          {data.recentSessions.map((session) => (
            <article key={session.id} className="min-w-0 rounded-3xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-black text-slate-950">{session.user.name}</h3>
                  <p className="break-all text-sm text-slate-500">{session.user.email}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${session.revokedAt ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>
                  {session.revokedAt ? "Revocada" : "Activa"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailLine label="Rol" value={session.user.role} />
                <DetailLine label="Dispositivo" value={session.deviceLabel} />
                <DetailLine label="Creada" value={new Date(session.createdAt).toLocaleString("es-CL")} />
                <DetailLine label="Expira" value={new Date(session.expiresAt).toLocaleString("es-CL")} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!session.revokedAt && <button className="secondary flex-1" onClick={() => revokeSession(session.id)}>Revocar sesión</button>}
                <button className="secondary flex-1" onClick={() => revokeAll(session.user.id)}>Revocar todas</button>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-hidden lg:block">
          <table className="w-full table-fixed text-left text-[clamp(.72rem,.8vw,.875rem)]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="w-[18%] px-3 py-4">Usuario</th>
                <th className="w-[10%] px-3 py-4">Rol</th>
                <th className="w-[15%] px-3 py-4">Dispositivo</th>
                <th className="w-[13%] px-3 py-4">Creada</th>
                <th className="w-[13%] px-3 py-4">Último uso</th>
                <th className="w-[13%] px-3 py-4">Expira</th>
                <th className="w-[9%] px-3 py-4">Estado</th>
                <th className="w-[9%] px-3 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSessions.map((session) => (
                <tr key={session.id} className="border-t border-slate-100 align-top">
                  <td className="break-words px-3 py-4 font-bold">{session.user.name}<small className="block break-all text-slate-400">{session.user.email}</small></td>
                  <td className="break-words px-3 py-4">{session.user.role}</td>
                  <td className="break-words px-3 py-4">{session.deviceLabel ?? "—"}<small className="block break-all font-mono text-slate-400">{session.ipHash ? `${session.ipHash.slice(0, 10)}…` : "—"}</small></td>
                  <td className="break-words px-3 py-4">{new Date(session.createdAt).toLocaleString("es-CL")}</td>
                  <td className="break-words px-3 py-4">{session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString("es-CL") : "—"}</td>
                  <td className="break-words px-3 py-4">{new Date(session.expiresAt).toLocaleString("es-CL")}</td>
                  <td className="break-words px-3 py-4">{session.revokedAt ? `Revocada · ${session.revokedReason ?? ""}` : "Activa"}</td>
                  <td className="space-y-2 px-3 py-4">
                    {!session.revokedAt && <button className="secondary w-full px-3" onClick={() => revokeSession(session.id)}>Revocar</button>}
                    <button className="secondary w-full px-3" onClick={() => revokeAll(session.user.id)}>Todas</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white">
        <div className="p-5"><h2 className="text-xl font-black">Eventos de riesgo</h2></div>
        <div className="grid gap-4 p-5 pt-0 lg:hidden">
          {data.riskEvents.map((event) => (
            <article key={event.id} className="min-w-0 rounded-3xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{new Date(event.createdAt).toLocaleString("es-CL")}</p>
                  <h3 className="mt-1 break-words font-black text-slate-950">{event.action}</h3>
                  <p className="mt-1 break-words text-sm text-slate-500">{event.user?.name ?? "Sistema"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${pillClass(riskStyle, event.riskLevel)}`}>{event.riskLevel}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailLine label="Resultado" value={event.result} />
                <DetailLine label="Request ID" value={compactId(event.requestId)} mono />
              </div>
              <button className="secondary mt-4 w-full" onClick={() => setSelectedEvent(event)}>Ver detalle</button>
            </article>
          ))}
        </div>
        <div className="hidden overflow-hidden lg:block">
          <table className="w-full table-fixed text-left text-[clamp(.72rem,.8vw,.875rem)]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="w-[16%] px-3 py-4">Fecha</th>
                <th className="w-[18%] px-3 py-4">Actor</th>
                <th className="w-[24%] px-3 py-4">Acción</th>
                <th className="w-[12%] px-3 py-4">Resultado</th>
                <th className="w-[12%] px-3 py-4">Riesgo</th>
                <th className="w-[12%] px-3 py-4">Request ID</th>
                <th className="w-[6%] px-3 py-4">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data.riskEvents.map((event) => (
                <tr key={event.id} className="border-t border-slate-100 align-top">
                  <td className="break-words px-3 py-4">{new Date(event.createdAt).toLocaleString("es-CL")}</td>
                  <td className="break-words px-3 py-4">{event.user?.name ?? "Sistema"}</td>
                  <td className="break-words px-3 py-4 font-bold">{event.action}</td>
                  <td className="px-3 py-4"><span className={`inline-block rounded-full px-2 py-1 text-[.68rem] font-black ${pillClass(resultStyle, event.result)}`}>{event.result}</span></td>
                  <td className="px-3 py-4"><span className={`inline-block rounded-full px-2 py-1 text-[.68rem] font-black ${pillClass(riskStyle, event.riskLevel)}`}>{event.riskLevel}</span></td>
                  <td className="break-all px-3 py-4 font-mono text-xs" title={event.requestId ?? undefined}>{compactId(event.requestId)}</td>
                  <td className="px-3 py-4"><button className="secondary px-3" onClick={() => setSelectedEvent(event)}>Ver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedEvent && (
        <aside className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Detalle de seguridad</p>
                <h2 className="break-words text-2xl font-black">{selectedEvent.action}</h2>
                <p className="mt-1 break-all text-sm text-slate-500">Request ID: {selectedEvent.requestId ?? "—"}</p>
              </div>
              <button className="secondary" onClick={() => setSelectedEvent(null)}>Cerrar</button>
            </div>
            <pre className="mt-5 max-w-full overflow-auto rounded-2xl bg-slate-950 p-5 text-xs text-cyan-100">
              {JSON.stringify(selectedEvent, null, 2)}
            </pre>
          </div>
        </aside>
      )}
    </main>
  );
}
