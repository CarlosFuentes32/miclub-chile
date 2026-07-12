import { Plan } from "../types/admin";

const periodLabel: Record<string, string> = {
  MONTHLY: "mes",
  QUARTERLY: "trimestre",
  SEMIANNUAL: "semestre",
  YEARLY: "año",
};

export function PlansTable({ items, onEdit, onToggle }: { items: Plan[]; onEdit: (p: Plan) => void; onToggle: (p: Plan) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {items.map((p) => (
        <article key={p.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-violet-500">{p.code ?? "SIN_CODIGO"} · v{p.version ?? 1}</p>
              <h2 className="mt-2 text-xl font-black">{p.name}</h2>
              <p className="mt-2 text-3xl font-black text-violet-700">
                ${p.monthlyPrice.toLocaleString("es-CL")}
                <small className="text-sm font-normal text-slate-400">/{periodLabel[p.billingPeriod ?? "MONTHLY"]}</small>
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">{p.currency ?? "CLP"} · {p.trialDays ?? 0} días prueba · {p.graceDays ?? 0} días gracia</p>
            </div>
            <span className={`h-3 w-3 rounded-full ${p.active ? "bg-emerald-500" : "bg-slate-300"}`} />
          </div>
          {p.description && <p className="mt-4 text-sm text-slate-500">{p.description}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <p><strong>{p.customerLimit}</strong><br /><span className="text-slate-400">clientes</span></p>
            <p><strong>{p.collaboratorLimit}</strong><br /><span className="text-slate-400">colaboradores</span></p>
          </div>
          <ul className="mt-5 space-y-2 text-sm text-slate-600">{p.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
          <p className="mt-4 text-xs font-bold text-slate-400">{p.publicVisible ? "Visible" : "Interno"} · {p.allowNewSubscriptions ? "Contratable" : "Cerrado a nuevos comercios"}</p>
          <div className="mt-6 flex gap-2">
            <button onClick={() => onEdit(p)} className="secondary flex-1">Editar</button>
            <button onClick={() => onToggle(p)} className="secondary flex-1">{p.active ? "Desactivar" : "Activar"}</button>
          </div>
        </article>
      ))}
    </div>
  );
}
