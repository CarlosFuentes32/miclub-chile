import { X } from "lucide-react";
import { AdminBusiness, BusinessStatus } from "../types/admin";
import { StatusBadge } from "./StatusBadge";
import { UsageTrafficLight } from "./UsageTrafficLight";
export function BusinessDetailPanel({
  business,
  onClose,
  onStatus,
  onDelete,
}: {
  business: AdminBusiness;
  onClose: () => void;
  onStatus: (s: BusinessStatus) => void;
  onDelete: () => void;
}) {
  const fields = [
    ["Rubro", business.category],
    ["RUT", business.rut ?? "No informado"],
    ["Dueño", business.owner],
    ["Teléfono", business.phone],
    ["Correo", business.email],
    ["Plan", business.plan],
    ["Clientes", business.customers],
    ["Transacciones", business.transactions],
    ["Recompensas", business.rewards],
    ["Último uso", business.lastUse],
    ["Programa activo", business.activeProgram],
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="float-right grid h-10 w-10 place-items-center rounded-full bg-slate-100"
        >
          <X />
        </button>
        <p className="eyebrow">Detalle de comercio</p>
        <h2 className="mt-2 text-3xl font-black">{business.name}</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <StatusBadge status={business.status} />
          <UsageTrafficLight level={business.usage} />
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {fields.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-slate-50 p-4">
              <small className="font-bold text-slate-400">{k}</small>
              <strong className="mt-1 block break-words">{v}</strong>
            </div>
          ))}
        </div>
        <button onClick={onDelete} className="danger mt-3 w-full">Eliminar comercio</button>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {business.status !== "active" && (
            <button onClick={() => onStatus("active")} className="primary">
              Reactivar comercio
            </button>
          )}
          {business.status !== "suspended" && (
            <button onClick={() => onStatus("suspended")} className="danger">
              Suspender comercio
            </button>
          )}
          {business.status === "cancelled" && (
            <button
              onClick={() => onStatus("grace_period")}
              className="secondary"
            >
              Pasar a período de gracia
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
