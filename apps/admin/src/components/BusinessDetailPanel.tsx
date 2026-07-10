import { FormEvent, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  AdminBusiness,
  BusinessStatus,
  Plan,
  UpdateBusinessInput,
} from "../types/admin";
import { StatusBadge } from "./StatusBadge";
import { UsageTrafficLight } from "./UsageTrafficLight";
export function BusinessDetailPanel({
  business,
  plans,
  onClose,
  onSave,
  onStatus,
  onDelete,
  onRestore,
}: {
  business: AdminBusiness;
  plans: Plan[];
  onClose: () => void;
  onSave: (v: UpdateBusinessInput) => Promise<void>;
  onStatus: (s: BusinessStatus) => void;
  onDelete: () => void;
  onRestore?: () => void;
}) {
  const initialPlanId = useMemo(
    () => plans.find((p) => p.name === business.plan)?.id ?? plans[0]?.id ?? "",
    [business.plan, plans],
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState<UpdateBusinessInput>({
    name: business.name,
    businessType: business.category,
    rutBusiness: business.rut ?? "",
    phone: business.phone,
    email: business.email,
    planId: initialPlanId,
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave(value);
      setEditing(false);
    } catch (x) {
      setError(
        x instanceof Error ? x.message : "No se pudo editar el comercio",
      );
    } finally {
      setSaving(false);
    }
  }
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
        {editing ? (
          <form
            onSubmit={submit}
            className="mt-7 rounded-3xl border border-violet-100 bg-violet-50/40 p-4"
          >
            <h3 className="text-lg font-black">Editar datos del comercio</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="field">
                Nombre
                <input
                  className="input"
                  value={value.name}
                  onChange={(e) =>
                    setValue((v) => ({ ...v, name: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                Rubro
                <input
                  className="input"
                  value={value.businessType}
                  onChange={(e) =>
                    setValue((v) => ({ ...v, businessType: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                RUT
                <input
                  className="input"
                  value={value.rutBusiness ?? ""}
                  onChange={(e) =>
                    setValue((v) => ({ ...v, rutBusiness: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </label>
              <label className="field">
                Plan
                <select
                  className="input"
                  value={value.planId}
                  onChange={(e) =>
                    setValue((v) => ({ ...v, planId: e.target.value }))
                  }
                  required
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Teléfono
                <input
                  className="input"
                  value={value.phone}
                  onChange={(e) =>
                    setValue((v) => ({ ...v, phone: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                Correo
                <input
                  className="input"
                  type="email"
                  value={value.email}
                  onChange={(e) =>
                    setValue((v) => ({ ...v, email: e.target.value }))
                  }
                  required
                />
              </label>
            </div>
            {error && (
              <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button disabled={saving} className="primary">
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="secondary mt-7 w-full"
          >
            Editar datos
          </button>
        )}
        {business.status === "deleted" ? (
          <button onClick={onRestore} className="primary mt-3 w-full">
            Restaurar comercio eliminado
          </button>
        ) : (
          <button onClick={onDelete} className="danger mt-3 w-full">
            Eliminar comercio
          </button>
        )}
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
