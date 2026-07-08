import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";

export function SuperCustomersPage() {
  const [items, setItems] = useState<any[]>([]),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<any | null>(null),
    [message, setMessage] = useState("");
  async function load(q = query) {
    setItems(await adminService.getCustomers(q));
  }
  useEffect(() => {
    void load("");
  }, []);
  async function open(id: string) {
    setSelected(await adminService.getCustomerFull(id));
  }
  async function impersonate(id: string) {
    const reason = prompt("Motivo obligatorio para ingresar como cliente");
    if (!reason) return;
    const result = await adminService.startImpersonation(id, reason);
    setMessage(
      result.banner +
        " · Solicitud auditada. Usa el portal cliente para soporte controlado.",
    );
  }
  async function adjust() {
    if (!selected) return;
    const businessId = selected.customerBusinesses?.[0]?.businessId;
    if (!businessId)
      return setMessage("El cliente no tiene comercio asociado.");
    const reason = prompt("Motivo obligatorio del ajuste manual");
    if (!reason) return;
    await adminService.adjustCustomer(selected.id, {
      businessId,
      type: "points",
      value: 1,
      reason,
    });
    setMessage("Ajuste manual registrado y auditado.");
    await open(selected.id);
  }
  async function reward() {
    if (!selected) return;
    const businessId = selected.customerBusinesses?.[0]?.businessId;
    if (!businessId)
      return setMessage("El cliente no tiene comercio asociado.");
    const description = prompt("Descripción de la recompensa manual") || "";
    const reason = prompt("Motivo obligatorio de la recompensa manual") || "";
    if (!description || !reason) return;
    await adminService.grantManualReward(selected.id, {
      businessId,
      description,
      reason,
    });
    setMessage("Recompensa manual entregada y auditada.");
    await open(selected.id);
  }
  return (
    <main className="page">
      <p className="eyebrow">Clientes</p>
      <h1 className="title">Gestión global de clientes</h1>
      <div className="mt-6 flex gap-3">
        <input
          className="input mt-0 max-w-xl"
          placeholder="Buscar por nombre, correo, teléfono o RUT"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="primary" onClick={() => load()}>
          Buscar
        </button>
      </div>
      {message && (
        <p className="mt-4 rounded-2xl bg-cyan-50 p-4 font-bold text-cyan-900">
          {message}
        </p>
      )}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_.9fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {items.map((u) => (
            <button
              key={u.id}
              onClick={() => open(u.id)}
              className="grid w-full grid-cols-[1fr_auto] border-t p-5 text-left first:border-0 hover:bg-violet-50"
            >
              <span>
                <strong>{u.name}</strong>
                <small className="block text-slate-500">
                  {u.email} · {u.phone}
                </small>
              </span>
              <span className="text-sm font-bold text-slate-500">
                {u.status}
              </span>
            </button>
          ))}
        </div>
        {selected && (
          <aside className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-black">{selected.name}</h2>
            <p className="mt-1 text-slate-500">
              {selected.email} · {selected.phone}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="secondary"
                onClick={() => impersonate(selected.id)}
              >
                Ingresar como cliente
              </button>
              <button className="secondary" onClick={adjust}>
                Agregar punto/sello
              </button>
              <button className="primary" onClick={reward}>
                Entregar recompensa
              </button>
              <button
                className="secondary"
                onClick={() =>
                  adminService
                    .updateUserStatus(selected.id, "suspended")
                    .then(() => load())
                }
              >
                Suspender
              </button>
            </div>
            <h3 className="mt-6 font-black">Comercios inscritos</h3>
            <div className="mt-2 space-y-2">
              {selected.customerBusinesses?.map((m: any) => (
                <p key={m.id} className="rounded-2xl bg-slate-50 p-3">
                  {m.business.name} · {m.business.status}
                </p>
              ))}
            </div>
            <h3 className="mt-6 font-black">Recompensas</h3>
            <div className="mt-2 space-y-2">
              {selected.rewards?.slice(0, 8).map((r: any) => (
                <p key={r.id} className="rounded-2xl bg-emerald-50 p-3">
                  {r.rewardDescription} · {r.status}
                </p>
              ))}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
