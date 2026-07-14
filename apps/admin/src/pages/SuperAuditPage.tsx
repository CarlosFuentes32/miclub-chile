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
        <pre className="mt-4 max-w-full overflow-auto rounded-3xl bg-slate-950 p-5 text-xs text-cyan-100">
          {JSON.stringify(retention, null, 2)}
        </pre>
      )}

      <div className="mt-5 grid gap-4 lg:hidden">
        {items.map((log) => (
          <article key={log.id} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{new Date(log.createdAt).toLocaleString("es-CL")}</p>
                <h3 className="mt-1 break-words text-lg font-black text-slate-950">{log.action}</h3>
                <p className="mt-1 break-words text-sm text-slate-500">{log.user?.name ?? "Sistema"} · {log.actorRole ?? log.user?.role ?? "Sin rol"}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${pillClass(riskStyle, log.riskLevel)}`}>{log.riskLevel}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailLine label="Resultado" value={log.result} />
              <DetailLine label="Comercio" value={log.business?.name} />
              <DetailLine label="Request ID" value={compactId(log.requestId)} mono />
              <DetailLine label="Ambiente" value={log.environment} />
            </div>
            <button className="secondary mt-4 w-full" onClick={() => setSelected(log)}>Ver detalle</button>
          </article>
        ))}
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-200 bg-white lg:block">
        <table className="w-full table-fixed text-left text-[clamp(.72rem,.8vw,.875rem)]">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="w-[10%] px-3 py-4">Fecha</th>
              <th className="w-[14%] px-3 py-4">Actor</th>
              <th className="w-[8%] px-3 py-4">Rol</th>
              <th className="w-[10%] px-3 py-4">Comercio</th>
              <th className="w-[15%] px-3 py-4">Acción</th>
              <th className="w-[10%] px-3 py-4">Módulo</th>
              <th className="w-[8%] px-3 py-4">Resultado</th>
              <th className="w-[7%] px-3 py-4">Riesgo</th>
              <th className="w-[8%] px-3 py-4">Request ID</th>
              <th className="w-[5%] px-3 py-4">Amb.</th>
              <th className="w-[5%] px-3 py-4">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="border-t border-slate-100 align-top">
                <td className="break-words px-3 py-4">{new Date(log.createdAt).toLocaleString("es-CL")}</td>
                <td className="break-words px-3 py-4">{log.user?.name ?? "Sistema"}<small className="block break-all text-slate-400">{log.user?.email}</small></td>
                <td className="break-words px-3 py-4">{log.actorRole ?? log.user?.role}</td>
                <td className="break-words px-3 py-4">{log.business?.name ?? "—"}</td>
                <td className="break-words px-3 py-4 font-black text-slate-900">{log.action}</td>
                <td className="break-words px-3 py-4">{log.module}<small className="block text-slate-400">{log.category}</small></td>
                <td className="px-3 py-4"><span className={`inline-block rounded-full px-2 py-1 text-[.68rem] font-black ${pillClass(resultStyle, log.result)}`}>{log.result}</span></td>
                <td className="px-3 py-4"><span className={`inline-block rounded-full px-2 py-1 text-[.68rem] font-black ${pillClass(riskStyle, log.riskLevel)}`}>{log.riskLevel}</span></td>
                <td className="break-all px-3 py-4 font-mono text-xs" title={log.requestId ?? undefined}>{compactId(log.requestId)}</td>
                <td className="break-words px-3 py-4">{log.environment}</td>
                <td className="px-3 py-4"><button className="secondary px-3" onClick={() => setSelected(log)}>Ver</button></td>
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
                <h2 className="break-words text-2xl font-black">{selected.action}</h2>
                <p className="mt-1 break-all text-sm text-slate-500">Request ID: {selected.requestId ?? "—"}</p>
              </div>
              <button className="secondary" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
            <pre className="mt-5 max-w-full overflow-auto rounded-2xl bg-slate-950 p-5 text-xs text-cyan-100">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        </aside>
      )}
    </main>
  );
}
