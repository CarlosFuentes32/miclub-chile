import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { SystemError } from "../types/admin";

const statusStyle: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  INVESTIGATING: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
};

export function SystemErrorsPage() {
  const [items, setItems] = useState<SystemError[]>([]);
  const [selected, setSelected] = useState<SystemError | null>(null);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState("");
  const [filters, setFilters] = useState({ status: "", requestId: "", endpoint: "", environment: "" });
  async function load() {
    const response = await adminService.getSystemErrors(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
    setItems(response.items);
    setTotal(response.total);
  }
  async function update(status: SystemError["status"]) {
    if (!selected) return;
    const updated = await adminService.updateSystemErrorStatus(selected.id, status, note);
    setSelected(updated);
    setNote("");
    await load();
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="page">
      <p className="eyebrow">Errores del sistema</p>
      <h1 className="title">Deduplicación e investigación</h1>
      <p className="subtitle">Agrupa errores iguales por huella segura, conserva request ID y permite seguimiento sin exponer stack traces sensibles.</p>
      <section className="mt-6 grid gap-3 md:grid-cols-5">
        <select className="input mt-0" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Todos</option>
          <option value="open">Abiertos</option>
          <option value="investigating">Investigando</option>
          <option value="resolved">Resueltos</option>
        </select>
        <input className="input mt-0" placeholder="Request ID" value={filters.requestId} onChange={(e) => setFilters({ ...filters, requestId: e.target.value })} />
        <input className="input mt-0" placeholder="Endpoint" value={filters.endpoint} onChange={(e) => setFilters({ ...filters, endpoint: e.target.value })} />
        <input className="input mt-0" placeholder="Ambiente" value={filters.environment} onChange={(e) => setFilters({ ...filters, environment: e.target.value })} />
        <button className="primary" onClick={load}>Filtrar</button>
      </section>
      <p className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">{total} grupos de error</p>
      <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>{["Estado", "Tipo", "Mensaje", "Ocurrencias", "Primera", "Última", "Endpoint", "Request ID", "Commit", ""].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((error) => (
              <tr key={error.id} className="border-t border-slate-100 align-top">
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle[error.status]}`}>{error.status}</span></td>
                <td className="px-5 py-4 font-bold">{error.type}</td>
                <td className="max-w-[280px] px-5 py-4">{error.message}</td>
                <td className="px-5 py-4 text-2xl font-black">{error.occurrenceCount}</td>
                <td className="px-5 py-4">{new Date(error.firstSeenAt).toLocaleString("es-CL")}</td>
                <td className="px-5 py-4">{new Date(error.lastSeenAt).toLocaleString("es-CL")}</td>
                <td className="max-w-[180px] truncate px-5 py-4">{error.endpoint}</td>
                <td className="max-w-[160px] truncate px-5 py-4 font-mono text-xs">{error.requestId ?? "—"}</td>
                <td className="max-w-[140px] truncate px-5 py-4 font-mono text-xs">{error.commit ?? "—"}</td>
                <td className="px-5 py-4"><button className="secondary" onClick={() => setSelected(error)}>Detalle</button></td>
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
                <p className="eyebrow">Error deduplicado</p>
                <h2 className="text-2xl font-black">{selected.type}</h2>
                <p className="mt-1 text-sm text-slate-500">Fingerprint: {selected.fingerprint.slice(0, 16)}…</p>
              </div>
              <button className="secondary" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input className="input mt-0" placeholder="Nota interna" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="secondary" onClick={() => update("INVESTIGATING")}>Marcar investigando</button>
              <button className="primary" onClick={() => update("RESOLVED")}>Marcar resuelto</button>
            </div>
            <pre className="mt-5 overflow-auto rounded-2xl bg-slate-950 p-5 text-xs text-cyan-100">{JSON.stringify(selected, null, 2)}</pre>
          </div>
        </aside>
      )}
    </main>
  );
}

