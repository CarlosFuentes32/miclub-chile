import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";

export function SuperCashiersPage() {
  const [items, setItems] = useState<any[]>([]),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState("");
  async function load() {
    setItems(await adminService.getCashiers("", query));
  }
  useEffect(() => {
    void load();
  }, []);
  async function impersonate(id: string) {
    const reason = prompt("Motivo obligatorio para ingresar como cajero");
    if (!reason) return;
    const result = await adminService.startImpersonation(id, reason);
    setMessage(result.banner + " · Solicitud auditada.");
  }
  return (
    <main className="page">
      <p className="eyebrow">Colaboradores</p>
      <h1 className="title">Cajeros del sistema</h1>
      <div className="mt-6 flex gap-3">
        <input
          className="input mt-0 max-w-xl"
          placeholder="Buscar cajero"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="primary" onClick={load}>
          Buscar
        </button>
      </div>
      {message && (
        <p className="mt-4 rounded-2xl bg-cyan-50 p-4 font-bold text-cyan-900">
          {message}
        </p>
      )}
      <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              {[
                "Cajero",
                "Comercio",
                "Estado",
                "Compras",
                "Canjes",
                "Acciones",
              ].map((h) => (
                <th key={h} className="px-5 py-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-5 py-4">
                  <strong>{u.name}</strong>
                  <small className="block text-slate-500">
                    {u.email} · {u.phone}
                  </small>
                </td>
                <td className="px-5 py-4">{u.business?.name}</td>
                <td className="px-5 py-4">{u.status}</td>
                <td className="px-5 py-4">
                  {u._count?.performedTransactions ??
                    u.performedTransactions ??
                    0}
                </td>
                <td className="px-5 py-4">
                  {u._count?.redeemedRewards ?? u.redeemedRewards ?? 0}
                </td>
                <td className="px-5 py-4">
                  <button
                    className="secondary"
                    onClick={() => impersonate(u.id)}
                  >
                    Ingresar como cajero
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
