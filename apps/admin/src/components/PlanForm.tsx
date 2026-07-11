import { FormEvent, useState } from "react";
import { Plan } from "../types/admin";

export function PlanForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Plan;
  onSave: (p: Omit<Plan, "id"> | Plan) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial?.monthlyPrice ?? 19990);
  const [currency, setCurrency] = useState(initial?.currency ?? "CLP");
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "YEARLY">(initial?.billingPeriod ?? "MONTHLY");
  const [trialDays, setTrialDays] = useState(initial?.trialDays ?? 0);
  const [customers, setCustomers] = useState(initial?.customerLimit ?? 500);
  const [collaborators, setCollaborators] = useState(initial?.collaboratorLimit ?? 3);
  const [features, setFeatures] = useState(initial?.features.join("\n") ?? "Programa de fidelización\nPanel cajero");
  const [active, setActive] = useState(initial?.active ?? true);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const base = {
      name,
      monthlyPrice: price,
      currency,
      billingPeriod,
      trialDays,
      customerLimit: customers,
      collaboratorLimit: collaborators,
      features: features.split("\n").map((item) => item.trim()).filter(Boolean),
      active,
    };
    await onSave(initial ? { ...base, id: initial.id } : base);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-3" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6">
        <h2 className="text-2xl font-black">{initial ? "Editar plan" : "Crear plan"}</h2>
        <label className="field mt-5">Nombre<input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="field">Precio<input className="input" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
          <label className="field">Moneda<input className="input" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="field">Periodicidad<select className="input" value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value as "MONTHLY" | "YEARLY")}><option value="MONTHLY">Mensual</option><option value="YEARLY">Anual</option></select></label>
          <label className="field">Días de prueba<input className="input" type="number" min={0} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} /></label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="field">Límite clientes<input className="input" type="number" value={customers} onChange={(e) => setCustomers(Number(e.target.value))} /></label>
          <label className="field">Límite colaboradores<input className="input" type="number" value={collaborators} onChange={(e) => setCollaborators(Number(e.target.value))} /></label>
        </div>
        <label className="field mt-4">Características <span>(una por línea)</span><textarea className="input min-h-28" value={features} onChange={(e) => setFeatures(e.target.value)} /></label>
        <label className="mt-4 flex items-center gap-3 font-bold"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Plan activo</label>
        <button className="primary mt-5 w-full">Guardar plan</button>
      </form>
    </div>
  );
}
