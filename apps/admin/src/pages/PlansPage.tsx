import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PlanForm } from "../components/PlanForm";
import { PlansTable } from "../components/PlansTable";
import { adminService } from "../services/admin.service";
import { BillingPayment, BillingSubscription, Plan } from "../types/admin";

export function PlansPage() {
  const [items, setItems] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<BillingSubscription[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | undefined>();
  const [manual, setManual] = useState({ businessId: "", planId: "", amount: 0, reference: "", reason: "", paymentMethod: "transferencia" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const [plans, subscriptions, rows] = await Promise.all([
      adminService.getPlans(),
      adminService.getBillingSubscriptions(),
      adminService.getBillingPayments(),
    ]);
    setItems(plans);
    setSubs(subscriptions);
    setPayments(rows);
  }

  async function save(value: Omit<Plan, "id"> | Plan) {
    if ("id" in value) {
      const p = await adminService.updatePlan(value);
      setItems((v) => v.map((x) => (x.id === p.id ? p : x)));
    } else {
      const p = await adminService.createPlan(value);
      setItems((v) => [...v, p]);
    }
    setOpen(false);
    setEditing(undefined);
  }

  async function toggle(p: Plan) {
    const updated = await adminService.updatePlan({ ...p, active: !p.active });
    setItems((v) => v.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function submitManual(e: FormEvent) {
    e.preventDefault();
    await adminService.registerManualPayment(manual);
    setMessage("Pago manual registrado con auditoría. No proviene de proveedor externo.");
    setManual({ businessId: "", planId: "", amount: 0, reference: "", reason: "", paymentMethod: "transferencia" });
    await refresh();
  }

  return (
    <div className="page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Oferta comercial y billing</p>
          <h1 className="title">Planes, suscripciones y pagos</h1>
          <p className="subtitle">Estructura interna preparada para proveedor real. No existen pagos online aprobados hasta conectar sandbox/webhooks.</p>
        </div>
        <button onClick={() => setOpen(true)} className="primary"><Plus size={18} /> Crear plan</button>
      </div>
      <div className="mt-7"><PlansTable items={items} onEdit={(p) => { setEditing(p); setOpen(true); }} onToggle={toggle} /></div>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Suscripciones</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Comercio</th><th>Plan</th><th>Estado</th><th>Próximo pago</th><th>Último pago</th></tr></thead>
              <tbody>{subs.map((s) => <tr key={s.id} className="border-t border-slate-100"><td className="py-3 font-bold">{s.business.name}</td><td>{s.plan.name}</td><td>{s.status}</td><td>{s.nextBillingAt ? new Date(s.nextBillingAt).toLocaleDateString("es-CL") : "Sin fecha"}</td><td>{s.lastPaymentStatus ?? "Sin pago"}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <form onSubmit={submitManual} className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="text-xl font-black">Registrar transferencia manual</h2>
          <p className="mt-2 text-sm text-slate-500">Solo Super Admin. Activa/renueva con trazabilidad; no simula proveedor externo.</p>
          <label className="field mt-4">Comercio<select className="input" value={manual.businessId} onChange={(e) => setManual((v) => ({ ...v, businessId: e.target.value }))} required><option value="">Seleccionar</option>{subs.map((s) => <option key={s.businessId} value={s.businessId}>{s.business.name}</option>)}</select></label>
          <label className="field mt-3">Plan<select className="input" value={manual.planId} onChange={(e) => { const plan = items.find((p) => p.id === e.target.value); setManual((v) => ({ ...v, planId: e.target.value, amount: plan?.monthlyPrice ?? v.amount })); }} required><option value="">Seleccionar</option>{items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <div className="mt-3 grid grid-cols-2 gap-3"><label className="field">Monto<input className="input" type="number" value={manual.amount} onChange={(e) => setManual((v) => ({ ...v, amount: Number(e.target.value) }))} required /></label><label className="field">Medio<input className="input" value={manual.paymentMethod} onChange={(e) => setManual((v) => ({ ...v, paymentMethod: e.target.value }))} /></label></div>
          <label className="field mt-3">Referencia<input className="input" value={manual.reference} onChange={(e) => setManual((v) => ({ ...v, reference: e.target.value }))} required /></label>
          <label className="field mt-3">Motivo<textarea className="input" value={manual.reason} onChange={(e) => setManual((v) => ({ ...v, reason: e.target.value }))} required /></label>
          <button className="primary mt-4 w-full">Registrar pago manual</button>
          {message && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p>}
        </form>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-black">Pagos</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Comercio</th><th>Monto</th><th>Estado</th><th>Proveedor</th><th>Referencia</th><th>Periodo</th></tr></thead>
            <tbody>{payments.map((p) => <tr key={p.id} className="border-t border-slate-100"><td className="py-3 font-bold">{p.business.name}</td><td>${p.amount.toLocaleString("es-CL")} {p.currency}</td><td>{p.status}</td><td>{p.provider}</td><td>{p.reference ?? "—"}</td><td>{p.periodEnd ? new Date(p.periodEnd).toLocaleDateString("es-CL") : "—"}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {open && <PlanForm initial={editing} onSave={save} onClose={() => { setOpen(false); setEditing(undefined); }} />}
    </div>
  );
}
