import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { SecurityDashboard } from "../types/admin";

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

export function SecurityPage() {
  const [data, setData] = useState<SecurityDashboard | null>(null);
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
      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {cards.map(([key, label]) => (
          <article key={key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{data.summary[key]}</p>
          </article>
        ))}
      </section>
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Configuración activa</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Object.entries(data.securityConfiguration).map(([key, enabled]) => (
            <span key={key} className={`rounded-full px-4 py-2 text-sm font-black ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {enabled ? "✓" : "!"} {key}
            </span>
          ))}
        </div>
      </section>
      <section className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <div className="p-5"><h2 className="text-xl font-black">Sesiones recientes</h2></div>
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>{["Usuario", "Rol", "Dispositivo", "Creada", "Último uso", "Expira", "Estado", "Acciones"].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.recentSessions.map((session) => (
              <tr key={session.id} className="border-t border-slate-100">
                <td className="px-5 py-4 font-bold">{session.user.name}<small className="block text-slate-400">{session.user.email}</small></td>
                <td className="px-5 py-4">{session.user.role}</td>
                <td className="px-5 py-4">{session.deviceLabel ?? "—"}<small className="block font-mono text-slate-400">{session.ipHash?.slice(0, 10)}…</small></td>
                <td className="px-5 py-4">{new Date(session.createdAt).toLocaleString("es-CL")}</td>
                <td className="px-5 py-4">{session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString("es-CL") : "—"}</td>
                <td className="px-5 py-4">{new Date(session.expiresAt).toLocaleString("es-CL")}</td>
                <td className="px-5 py-4">{session.revokedAt ? `Revocada · ${session.revokedReason ?? ""}` : "Activa"}</td>
                <td className="space-x-2 px-5 py-4">
                  {!session.revokedAt && <button className="secondary" onClick={() => revokeSession(session.id)}>Revocar</button>}
                  <button className="secondary" onClick={() => revokeAll(session.user.id)}>Revocar todas</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <div className="p-5"><h2 className="text-xl font-black">Eventos de riesgo</h2></div>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>{["Fecha", "Actor", "Acción", "Resultado", "Riesgo", "Request ID"].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.riskEvents.map((event) => (
              <tr key={event.id} className="border-t border-slate-100">
                <td className="px-5 py-4">{new Date(event.createdAt).toLocaleString("es-CL")}</td>
                <td className="px-5 py-4">{event.user?.name ?? "Sistema"}</td>
                <td className="px-5 py-4 font-bold">{event.action}</td>
                <td className="px-5 py-4">{event.result}</td>
                <td className="px-5 py-4">{event.riskLevel}</td>
                <td className="max-w-[180px] truncate px-5 py-4 font-mono text-xs">{event.requestId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
