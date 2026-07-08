import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";

export function SuperMaintenancePage() {
  const [data, setData] = useState<any>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    adminService.getMaintenance().then(setData);
  }, []);
  async function exportEntity(entity: string) {
    const rows = await adminService.exportData(entity);
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `miclub-${entity}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Exportación ${entity} preparada.`);
  }
  if (!data) return <main className="page">Cargando mantenimiento…</main>;
  return (
    <main className="page">
      <p className="eyebrow">Sistema</p>
      <h1 className="title">Mantenimiento</h1>
      <section className="mt-7 grid gap-4 md:grid-cols-3">
        {[
          ["API", data.api],
          ["Base de datos", data.database],
          ["Usuarios", data.users],
          ["Comercios", data.businesses],
          ["Eventos auditados", data.auditCount],
          ["Backend", data.backendVersion],
        ].map(([k, v]) => (
          <article key={k} className="rounded-3xl bg-white p-5 shadow-sm">
            <small className="font-bold text-slate-400">{k}</small>
            <strong className="mt-2 block text-2xl">{v}</strong>
          </article>
        ))}
      </section>
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Exportaciones</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {["businesses", "customers", "transactions", "rewards", "audit"].map(
            (e) => (
              <button
                key={e}
                className="secondary"
                onClick={() => exportEntity(e)}
              >
                Exportar {e}
              </button>
            ),
          )}
        </div>
        {message && (
          <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
            {message}
          </p>
        )}
      </section>
      <section className="mt-6 rounded-3xl bg-slate-950 p-6 text-white">
        <h2 className="text-xl font-black">Dominios configurados</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {data.domains.map((d: string) => (
            <span key={d} className="rounded-2xl bg-white/10 p-3">
              {d}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
