import { FormEvent, useEffect, useState } from "react";
import { commerceService } from "../services/commerce.service";
import { BillingSummary } from "../types/commerce";

export function BillingPage() {
  const [data, setData] = useState<BillingSummary | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { commerceService.getBilling().then(setData); }, []);
  async function requestChange(e: FormEvent) {
    e.preventDefault();
    await commerceService.requestPlanChange(undefined, reason);
    setMessage("Solicitud registrada. El equipo MiClub revisará tu caso.");
    setReason("");
  }
  async function requestCancel() {
    if (!reason.trim()) return setMessage("Indica un motivo antes de solicitar cancelación.");
    await commerceService.requestBillingCancel(reason);
    setMessage("Solicitud de cancelación registrada. No se ejecuta automáticamente.");
    setReason("");
  }
  if (!data) return <main className="page">Cargando plan…</main>;
  const sub = data.subscription;
  return (
    <div className="page">
      <p className="eyebrow">Suscripción</p>
      <h1 className="title">Plan y pagos</h1>
      <p className="subtitle">Consulta el estado de tu plan. Los pagos online se habilitarán cuando MiClub conecte el proveedor oficial.</p>
      {!sub ? <section className="mt-7 rounded-3xl bg-white p-6 shadow-sm">Este comercio aún no tiene una suscripción configurada.</section> : (
        <section className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-violet-600">Plan actual</p>
            <h2 className="mt-2 text-2xl font-black">{sub.plan.name}</h2>
            <p className="mt-3 text-4xl font-black">${sub.plan.monthlyPrice.toLocaleString("es-CL")}<small className="text-sm text-slate-400">/{sub.plan.billingPeriod === "YEARLY" ? "año" : "mes"}</small></p>
            <div className="mt-5 grid gap-2 text-sm text-slate-600">
              <p><strong>Estado:</strong> {sub.status}</p>
              <p><strong>Próximo pago:</strong> {sub.nextBillingAt ? new Date(sub.nextBillingAt).toLocaleDateString("es-CL") : "Sin fecha"}</p>
              <p><strong>Último pago:</strong> {sub.lastPaymentStatus ?? "Sin pago registrado"}</p>
              <p><strong>Límites:</strong> {sub.plan.customerLimit} clientes · {sub.plan.collaboratorLimit} colaboradores</p>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">{sub.plan.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <button className="secondary mt-5 w-full" disabled={!data.paymentPortalReady}>Ir a pago online</button>
            {!data.paymentPortalReady && <p className="mt-2 text-xs text-slate-400">{data.message}</p>}
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Historial de pagos</h2>
            <div className="mt-4 space-y-3">
              {data.payments.length ? data.payments.map((p) => (
                <div key={p.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between gap-3"><strong>${p.amount.toLocaleString("es-CL")} {p.currency}</strong><span>{p.status}</span></div>
                  <p className="mt-1 text-slate-500">{p.provider} · {p.reference ?? "sin referencia"} · {p.periodEnd ? new Date(p.periodEnd).toLocaleDateString("es-CL") : "sin periodo"}</p>
                </div>
              )) : <p className="text-slate-500">Aún no hay pagos registrados.</p>}
            </div>
          </article>
        </section>
      )}
      <form onSubmit={requestChange} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Solicitudes comerciales</h2>
        <textarea className="input mt-3 min-h-28" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Indica el motivo para cambiar plan o cancelar…" required />
        <div className="mt-4 flex flex-wrap gap-3"><button className="primary">Solicitar cambio de plan</button><button type="button" className="secondary" onClick={requestCancel}>Solicitar cancelación</button></div>
        {message && <p className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm font-bold text-violet-700">{message}</p>}
      </form>
    </div>
  );
}
