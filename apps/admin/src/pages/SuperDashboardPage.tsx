import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { SuperDashboard } from "../types/admin";

export function SuperDashboardPage() {
  const [data, setData] = useState<SuperDashboard | null>(null);
  useEffect(() => {
    adminService.getSuperDashboard().then(setData);
  }, []);
  if (!data) return <main className="page">Cargando control global…</main>;
  const cards = [
    ["Total comercios", data.totalBusinesses],
    ["Activos", data.activeBusinesses],
    ["Suspendidos", data.suspendedBusinesses],
    ["Eliminados", data.deletedBusinesses],
    ["Clientes", data.totalCustomers],
    ["Cajeros", data.totalCashiers],
    ["Administradores", data.totalAdmins],
    ["Programas activos", data.activePrograms],
    ["Compras registradas", data.totalPurchases],
    ["Canjes realizados", data.totalRedeems],
    ["Recompensas entregadas", data.rewardsDelivered],
    ["Actividad hoy", data.activityToday],
    ["Actividad últimos 7 días", data.activityWeek],
  ];
  return (
    <main className="page">
      <p className="eyebrow">Administración Global</p>
      <h1 className="title">Super Administrador</h1>
      <p className="subtitle">
        Control operacional, soporte y auditoría avanzada de MiClub Chile.
      </p>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article
            key={label}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <strong className="mt-3 block text-3xl font-black">{value}</strong>
          </article>
        ))}
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl bg-slate-950 p-6 text-white">
          <h2 className="text-xl font-black">Comercios con mayor movimiento</h2>
          <div className="mt-4 space-y-3">
            {data.topBusinesses.map((b) => (
              <div key={b.id} className="rounded-2xl bg-white/10 p-4">
                <strong>{b.name}</strong>
                <p className="mt-1 text-sm text-slate-300">
                  {b.transactions} compras · {b.rewards} recompensas ·{" "}
                  {b.customers} clientes
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Clientes con más actividad</h2>
          <div className="mt-4 space-y-3">
            {data.topCustomers.map((c) => (
              <div key={c.id} className="rounded-2xl bg-slate-50 p-4">
                <strong>{c.name}</strong>
                <p className="mt-1 text-sm text-slate-500">
                  {c.email} · {c.transactions} compras · {c.rewards} recompensas
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
