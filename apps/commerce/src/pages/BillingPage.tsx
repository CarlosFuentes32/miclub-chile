import { FormEvent, useEffect, useMemo, useState } from "react";
import { commerceService } from "../services/commerce.service";
import { BillingSummary } from "../types/commerce";

const labels: Record<string, string> = {
  DRAFT: "En configuración",
  TRIALING: "Periodo de prueba",
  ACTIVE: "Activo",
  GRACE_PERIOD: "Periodo de gracia",
  PAST_DUE: "Pago vencido",
  SUSPENDED: "Suspendido",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REVERSED: "Reversado",
};

function date(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
}

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
  const sub = data?.subscription;
  const daysLeft = useMemo(() => {
    const target = sub?.trialEndsAt ?? sub?.nextBillingAt;
    if (!target) return null;
    return Math.ceil((new Date(target).getTime() - Date.now()) / 86_400_000);
  }, [sub?.trialEndsAt, sub?.nextBillingAt]);

  if (!data) return <main className="page">Cargando plan…</main>;
  return (
    <div className="page">
      <p className="eyebrow">Suscripción</p>
      <h1 className="title">Plan y pagos</h1>
      <p className="subtitle">Consulta tu plan, próximos vencimientos e historial. El pago online se habilitará cuando MiClub conecte el proveedor oficial.</p>
      {!sub ? <section className="mt-7 rounded-3xl bg-white p-6 shadow-sm">Este comercio aún no tiene una suscripción configurada.</section> : (
        <section className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-violet-600">Plan actual</p>
            <h2 className="mt-2 text-2xl font-black">{sub.plan.name}</h2>
            <p className="mt-3 text-4xl font-black">${sub.plan.monthlyPrice.toLocaleString("es-CL")}<small className="text-sm text-slate-400">/{sub.plan.billingPeriod === "YEARLY" ? "año" : sub.plan.billingPeriod === "SEMIANNUAL" ? "semestre" : sub.plan.billingPeriod === "QUARTERLY" ? "trimestre" : "mes"}</small></p>
            <div className="mt-5 grid gap-2 text-sm text-slate-600">
              <p><strong>Estado:</strong> {labels[sub.status] ?? sub.status}</p>
              <p><strong>Inicio:</strong> {date(sub.startedAt)}</p>
              <p><strong>Fin de prueba:</strong> {date(sub.trialEndsAt)}</p>
              <p><strong>Próximo vencimiento:</strong> {date(sub.nextBillingAt)}</p>
              <p><strong>Periodo de gracia:</strong> {date(sub.graceEndsAt)}</p>
              <p><strong>Último pago:</strong> {labels[sub.lastPaymentStatus ?? ""] ?? "Sin pago registrado"}</p>
              {daysLeft !== null && <p><strong>Días restantes:</strong> {daysLeft >= 0 ? daysLeft : 0}</p>}
              <p><strong>Límites:</strong> {sub.plan.customerLimit} clientes · {sub.plan.collaboratorLimit} colaboradores</p>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">{sub.plan.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm text-violet-900">
              <strong>Transferencia manual:</strong> registra tu comprobante/referencia con soporte. MiClub revisa y aprueba el pago antes de renovar.
            </div>
            <button className="secondary mt-5 w-full" disabled={!data.paymentPortalReady}>Pago online próximamente</button>
            {!data.paymentPortalReady && <p className="mt-2 text-xs text-slate-400">{data.message}</p>}
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Historial de pagos</h2>
            <div className="mt-4 space-y-3">
              {data.payments.length ? data.payments.map((p) => (
                <div key={p.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between gap-3"><strong>${p.amount.toLocaleString("es-CL")} {p.currency}</strong><span>{labels[p.status] ?? p.status}</span></div>
                  <p className="mt-1 text-slate-500">{p.provider} · {p.reference ?? "sin referencia"} · {p.periodEnd ? new Date(p.periodEnd).toLocaleDateString("es-CL") : "sin periodo"}</p>
                </div>
              )) : <p className="text-slate-500">Aún no hay pagos registrados.</p>}
            </div>
          </article>
        </section>
      )}
      <form onSubmit={requestChange} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Solicitudes comerciales</h2>
        <textarea className="input mt-3 min-h-28" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Indica el motivo para cambiar plan, revisar un pago o cancelar…" required />
        <div className="mt-4 flex flex-wrap gap-3"><button className="primary">Solicitar cambio de plan</button><button type="button" className="secondary" onClick={requestCancel}>Solicitar cancelación</button></div>
        {message && <p className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm font-bold text-violet-700">{message}</p>}
      </form>
    </div>
  );
}
