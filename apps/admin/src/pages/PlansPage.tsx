import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PlanForm } from "../components/PlanForm";
import { PlansTable } from "../components/PlansTable";
import { adminService } from "../services/admin.service";
import { BillingOverview, BillingPayment, BillingRequest, BillingSubscription, Plan } from "../types/admin";

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  TRIALING: "Trial",
  ACTIVE: "Activo",
  GRACE_PERIOD: "Gracia",
  PAST_DUE: "Moroso",
  SUSPENDED: "Suspendido",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REVERSED: "Reversado",
};

function clp(value: number) {
  return `$${Math.round(value).toLocaleString("es-CL")} CLP`;
}

function date(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
}

export function PlansPage() {
  const [items, setItems] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<BillingSubscription[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [requests, setRequests] = useState<BillingRequest[]>([]);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | undefined>();
  const [manual, setManual] = useState({ businessId: "", planId: "", amount: 0, reference: "", reason: "", paymentMethod: "transferencia" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const [plans, subscriptions, rows, metrics, reqs] = await Promise.all([
      adminService.getPlans(),
      adminService.getBillingSubscriptions(),
      adminService.getBillingPayments(),
      adminService.getBillingOverview(),
      adminService.getBillingRequests(),
    ]);
    setItems(plans);
    setSubs(subscriptions);
    setPayments(rows);
    setOverview(metrics);
    setRequests(reqs);
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
    await refresh();
  }

  async function toggle(p: Plan) {
    const updated = await adminService.updatePlan({ ...p, active: !p.active });
    setItems((v) => v.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function submitManual(e: FormEvent) {
    e.preventDefault();
    await adminService.registerManualPayment(manual);
    setMessage("Transferencia registrada como PENDIENTE. Debe aprobarse manualmente para renovar/reactivar.");
    setManual({ businessId: "", planId: "", amount: 0, reference: "", reason: "", paymentMethod: "transferencia" });
    await refresh();
  }

  async function reviewPayment(payment: BillingPayment, action: "approve" | "reject" | "reverse") {
    const reason = window.prompt("Motivo obligatorio de revisión financiera:");
    if (!reason || reason.trim().length < 5) return;
    if (action === "approve") await adminService.approveManualPayment(payment.id, reason);
    if (action === "reject") await adminService.rejectManualPayment(payment.id, reason, reason);
    if (action === "reverse") await adminService.reverseManualPayment(payment.id, reason);
    setMessage("Pago revisado con auditoría financiera.");
    await refresh();
  }

  const pendingPayments = useMemo(() => payments.filter((p) => p.status === "PENDING"), [payments]);

  return (
    <div className="page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Oferta comercial y billing</p>
          <h1 className="title">Planes, suscripciones y cobranza</h1>
          <p className="subtitle">Cobranza operativa por transferencia. Los pagos online y webhooks reales siguen desacoplados hasta conectar proveedor sandbox.</p>
        </div>
        <button onClick={() => setOpen(true)} className="primary"><Plus size={18} /> Crear plan</button>
      </div>

      {overview && (
        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="MRR estimado" value={clp(overview.estimatedMrr)} />
          <Metric title="Cobrado confirmado" value={clp(overview.confirmedRevenue)} />
          <Metric title="Pagos pendientes" value={String(overview.pendingPayments)} />
          <Metric title="Solicitudes abiertas" value={String(overview.openRequests)} />
        </section>
      )}

      <div className="mt-7"><PlansTable items={items} onEdit={(p) => { setEditing(p); setOpen(true); }} onToggle={toggle} /></div>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Suscripciones</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Comercio</th><th>Plan</th><th>Estado</th><th>Trial</th><th>Próximo pago</th><th>Gracia</th><th>Último pago</th></tr></thead>
              <tbody>{subs.map((s) => <tr key={s.id} className="border-t border-slate-100"><td className="py-3 font-bold">{s.business.name}</td><td>{s.plan.name}</td><td>{statusLabels[s.status] ?? s.status}</td><td>{date(s.trialEndsAt)}</td><td>{date(s.nextBillingAt)}</td><td>{date(s.graceEndsAt)}</td><td>{statusLabels[s.lastPaymentStatus ?? ""] ?? "Sin pago"}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <form onSubmit={submitManual} className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="text-xl font-black">Registrar transferencia</h2>
          <p className="mt-2 text-sm text-slate-500">Queda pendiente hasta aprobación Super Admin. No procesa cobros reales.</p>
          <label className="field mt-4">Comercio<select className="input" value={manual.businessId} onChange={(e) => setManual((v) => ({ ...v, businessId: e.target.value }))} required><option value="">Seleccionar</option>{subs.map((s) => <option key={s.businessId} value={s.businessId}>{s.business.name}</option>)}</select></label>
          <label className="field mt-3">Plan<select className="input" value={manual.planId} onChange={(e) => { const plan = items.find((p) => p.id === e.target.value); setManual((v) => ({ ...v, planId: e.target.value, amount: plan?.monthlyPrice ?? v.amount })); }} required><option value="">Seleccionar</option>{items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <div className="mt-3 grid grid-cols-2 gap-3"><label className="field">Monto<input className="input" type="number" value={manual.amount} onChange={(e) => setManual((v) => ({ ...v, amount: Number(e.target.value) }))} required /></label><label className="field">Medio<input className="input" value={manual.paymentMethod} onChange={(e) => setManual((v) => ({ ...v, paymentMethod: e.target.value }))} /></label></div>
          <label className="field mt-3">Referencia<input className="input" value={manual.reference} onChange={(e) => setManual((v) => ({ ...v, reference: e.target.value }))} required /></label>
          <label className="field mt-3">Motivo<textarea className="input" value={manual.reason} onChange={(e) => setManual((v) => ({ ...v, reason: e.target.value }))} required /></label>
          <button className="primary mt-4 w-full">Registrar pendiente</button>
          {message && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p>}
        </form>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Pagos pendientes de revisión</h2>
          <div className="mt-4 space-y-3">
            {pendingPayments.length ? pendingPayments.map((p) => (
              <div key={p.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3"><strong>{p.business.name} · {clp(p.amount)}</strong><span>{p.reference}</span></div>
                <div className="mt-3 flex flex-wrap gap-2"><button className="primary" onClick={() => reviewPayment(p, "approve")}>Aprobar</button><button className="secondary" onClick={() => reviewPayment(p, "reject")}>Rechazar</button></div>
              </div>
            )) : <p className="text-slate-500">No hay pagos pendientes.</p>}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Solicitudes comerciales</h2>
          <div className="mt-4 space-y-3">
            {requests.slice(0, 8).map((r) => <div key={r.id} className="rounded-2xl bg-slate-50 p-4 text-sm"><strong>{r.type}</strong><p className="mt-1 text-slate-500">{r.reason}</p><span className="mt-2 inline-block text-xs font-bold text-violet-600">{r.status}</span></div>)}
            {!requests.length && <p className="text-slate-500">Sin solicitudes abiertas.</p>}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">Pagos auditados</h2>
          <div className="flex gap-2"><button className="secondary" onClick={() => adminService.runBillingReminders().then(() => refresh())}>Ejecutar recordatorios</button><button className="secondary" onClick={() => adminService.exportBilling("payments", "Exportación operativa de Sprint 7").then((r) => setMessage(`Exportación generada: ${r.rows} filas`))}>Exportar pagos</button></div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Comercio</th><th>Monto</th><th>Estado</th><th>Proveedor</th><th>Referencia</th><th>Periodo</th><th>Acción</th></tr></thead>
            <tbody>{payments.map((p) => <tr key={p.id} className="border-t border-slate-100"><td className="py-3 font-bold">{p.business.name}</td><td>{clp(p.amount)}</td><td>{statusLabels[p.status] ?? p.status}</td><td>{p.provider}</td><td>{p.reference ?? "—"}</td><td>{date(p.periodEnd)}</td><td>{p.status === "APPROVED" && <button className="secondary" onClick={() => reviewPayment(p, "reverse")}>Reversar</button>}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {open && <PlanForm initial={editing} onSave={save} onClose={() => { setOpen(false); setEditing(undefined); }} />}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <article className="rounded-3xl border border-slate-200 bg-white p-5"><p className="text-sm font-bold text-slate-500">{title}</p><p className="mt-3 text-2xl font-black">{value}</p></article>;
}
