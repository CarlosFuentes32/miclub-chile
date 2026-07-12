import { useEffect, useMemo, useState } from "react";
import { adminService } from "../services/admin.service";
import { AuditLog } from "../types/admin";

const resultStyle: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  FAILURE: "bg-red-100 text-red-700",
  DENIED: "bg-amber-100 text-amber-700",
  PARTIAL: "bg-cyan-100 text-cyan-700",
};

const riskStyle: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export function SuperAuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [retention, setRetention] = useState<any>(null);
  const [filters, setFilters] = useState({
    user: "",
    role: "",
    action: "",
    category: "",
    module: "",
    result: "",
    riskLevel: "",
    requestId: "",
    correlationId: "",
    environment: "",
    statusCode: "",
    pageSize: "50",
  });
  const activeFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    [filters],
  );
  async function load() {
    const response = await adminService.getAuditLogs(activeFilters);
    setItems(response.items);
    setTotal(response.total);
  }
  async function exportCsv() {
    const response = await adminService.exportAudit(activeFilters);
    setMessage(`Exportación segura preparada: ${response.filename} (${response.rows} filas).`);
  }
  async function dryRunRetention() {
    setRetention(await adminService.auditRetentionDryRun());
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="page">
      <p className="eyebrow">Auditoría y trazabilidad</p>
      <h1 className="title">Evidencia operacional</h1>
      <p className="subtitle">
        Reconstruye acciones críticas por usuario, comercio, request ID, versión, resultado y riesgo sin exponer datos sensibles.
      </p>
      <section className="mt-6 grid gap-3 md:grid-cols-4 xl:grid-cols-6">
        <input className="input mt-0" placeholder="Usuario" value={filters.user} onChange={(e) => setFilters({ ...filters, user: e.target.value })} />
        <select className="input mt-0" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="">Todos los roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="MICLUB_ADMIN">Admin</option>
          <option value="BUSINESS_OWNER">Comercio</option>
          <option value="CASHIER">Cajero</option>
          <option value="CUSTOMER">Cliente</option>
        </select>
        <input className="input mt-0" placeholder="Acción" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
        <input className="input mt-0" placeholder="Categoría" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
        <input className="input mt-0" placeholder="Módulo" value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value })} />
        <select className="input mt-0" value={filters.result} onChange={(e) => setFilters({ ...filters, result: e.target.value })}>
          <option value="">Resultado</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="denied">Denied</option>
          <option value="partial">Partial</option>
        </select>
        <select className="input mt-0" value={filters.riskLevel} onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}>
          <option value="">Riesgo</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <input className="input mt-0" placeholder="Request ID" value={filters.requestId} onChange={(e) => setFilters({ ...filters, requestId: e.target.value })} />
        <input className="input mt-0" placeholder="Correlation ID" value={filters.correlationId} onChange={(e) => setFilters({ ...filters, correlationId: e.target.value })} />
        <input className="input mt-0" placeholder="Ambiente" value={filters.environment} onChange={(e) => setFilters({ ...filters, environment: e.target.value })} />
        <input className="input mt-0" placeholder="HTTP" value={filters.statusCode} onChange={(e) => setFilters({ ...filters, statusCode: e.target.value })} />
        <button className="primary" onClick={load}>Filtrar</button>
      </section>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="secondary" onClick={exportCsv}>Exportar CSV seguro</button>
        <button className="secondary" onClick={dryRunRetention}>Retención dry-run</button>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">{total} eventos</span>
        {message && <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">{message}</span>}
      </div>
      {retention && (
        <pre className="mt-4 overflow-auto rounded-3xl bg-slate-950 p-5 text-xs text-cyan-100">
          {JSON.stringify(retention, null, 2)}
        </pre>
      )}
      <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1250px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>{["Fecha", "Actor", "Rol", "Comercio", "Acción", "Módulo", "Resultado", "Riesgo", "Request ID", "Ambiente", "Versión", ""].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="border-t border-slate-100 align-top">
                <td className="px-5 py-4">{new Date(log.createdAt).toLocaleString("es-CL")}</td>
                <td className="px-5 py-4">{log.user?.name ?? "Sistema"}<small className="block text-slate-400">{log.user?.email}</small></td>
                <td className="px-5 py-4">{log.actorRole ?? log.user?.role}</td>
                <td className="px-5 py-4">{log.business?.name ?? "—"}</td>
                <td className="px-5 py-4 font-black text-slate-900">{log.action}</td>
                <td className="px-5 py-4">{log.module}<small className="block text-slate-400">{log.category}</small></td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${resultStyle[log.result] ?? "bg-slate-100"}`}>{log.result}</span></td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${riskStyle[log.riskLevel] ?? "bg-slate-100"}`}>{log.riskLevel}</span></td>
                <td className="max-w-[180px] truncate px-5 py-4 font-mono text-xs">{log.requestId ?? "—"}</td>
                <td className="px-5 py-4">{log.environment}</td>
                <td className="max-w-[150px] truncate px-5 py-4 font-mono text-xs">{log.commit ?? log.version ?? "—"}</td>
                <td className="px-5 py-4"><button className="secondary" onClick={() => setSelected(log)}>Detalle</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <aside className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Detalle de evento</p>
                <h2 className="text-2xl font-black">{selected.action}</h2>
                <p className="mt-1 text-sm text-slate-500">Request ID: {selected.requestId ?? "—"}</p>
              </div>
              <button className="secondary" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
            <pre className="mt-5 overflow-auto rounded-2xl bg-slate-950 p-5 text-xs text-cyan-100">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        </aside>
      )}
    </main>
  );
}

