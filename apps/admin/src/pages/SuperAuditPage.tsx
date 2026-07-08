import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { AuditLog } from "../types/admin";

export function SuperAuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]),
    [filters, setFilters] = useState({
      user: "",
      role: "",
      action: "",
      entityType: "",
    });
  async function load() {
    setItems(
      await adminService.getAuditLogs(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      ),
    );
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="page">
      <p className="eyebrow">Auditoría</p>
      <h1 className="title">Logs del sistema</h1>
      <p className="subtitle">
        Registro de acciones críticas, soporte, canjes, anulaciones e
        impersonaciones.
      </p>
      <section className="mt-6 grid gap-3 md:grid-cols-5">
        <input
          className="input mt-0"
          placeholder="Usuario"
          value={filters.user}
          onChange={(e) => setFilters({ ...filters, user: e.target.value })}
        />
        <select
          className="input mt-0"
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
        >
          <option value="">Todos los roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="MICLUB_ADMIN">Admin</option>
          <option value="BUSINESS_OWNER">Comercio</option>
          <option value="CASHIER">Cajero</option>
          <option value="CUSTOMER">Cliente</option>
        </select>
        <input
          className="input mt-0"
          placeholder="Acción"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
        />
        <input
          className="input mt-0"
          placeholder="Entidad"
          value={filters.entityType}
          onChange={(e) =>
            setFilters({ ...filters, entityType: e.target.value })
          }
        />
        <button className="primary" onClick={load}>
          Filtrar
        </button>
      </section>
      <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              {[
                "Fecha",
                "Usuario",
                "Rol",
                "Acción",
                "Módulo",
                "Entidad",
                "Comercio / motivo",
              ].map((h) => (
                <th key={h} className="px-5 py-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="border-t border-slate-100">
                <td className="px-5 py-4">
                  {new Date(log.createdAt).toLocaleString("es-CL")}
                </td>
                <td className="px-5 py-4">
                  {log.user?.name}
                  <small className="block text-slate-400">
                    {log.user?.email}
                  </small>
                </td>
                <td className="px-5 py-4">{log.user?.role}</td>
                <td className="px-5 py-4 font-bold">{log.action}</td>
                <td className="px-5 py-4">{log.entityType}</td>
                <td className="px-5 py-4">{log.entityId}</td>
                <td className="px-5 py-4">
                  {log.business?.name ??
                    String((log.metadata as any)?.reason ?? "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
