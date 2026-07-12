import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminService } from "../services/admin.service";
import { SupportDashboard, SupportSearchResult, SupportTicket } from "../types/admin";

const categories = ["ACCESS", "ACCOUNT", "BUSINESS", "CASHIER", "CUSTOMER", "PROGRAM", "REWARD", "TRANSACTION", "REDEEM", "BILLING", "SECURITY", "INCIDENT", "CONFIGURATION", "OTHER"];
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statuses = ["NEW", "OPEN", "INVESTIGATING", "WAITING_CUSTOMER", "WAITING_INTERNAL", "RESOLVED", "CLOSED", "REOPENED"];

export function SupportPage() {
  const [dashboard, setDashboard] = useState<SupportDashboard | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("Atención de ticket o diagnóstico solicitado por cliente");
  const [results, setResults] = useState<SupportSearchResult | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [macros, setMacros] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [sla, setSla] = useState<any[]>([]);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    category: "ACCESS",
    priority: "MEDIUM",
    businessId: "",
    userId: "",
    requestId: "",
    incidentId: "",
  });

  async function load() {
    const [d, t, m, k, s] = await Promise.all([
      adminService.getSupportDashboard(),
      adminService.getSupportTickets(),
      adminService.getSupportMacros(),
      adminService.getSupportKnowledgeBase(),
      adminService.getSupportSla(),
    ]);
    setDashboard(d);
    setTickets(t);
    setMacros(m);
    setArticles(k);
    setSla(s);
  }

  useEffect(() => {
    load().catch((e) => setMessage(e instanceof Error ? e.message : "No fue posible cargar soporte"));
  }, []);

  const openTickets = useMemo(() => tickets.filter((t) => !["RESOLVED", "CLOSED"].includes(t.status)), [tickets]);

  async function doSearch(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setResults(await adminService.supportSearch(search, reason, selectedTicket?.id));
  }

  async function createTicket(e: FormEvent) {
    e.preventDefault();
    const created = await adminService.createSupportTicket({
      ...ticketForm,
      businessId: ticketForm.businessId || undefined,
      userId: ticketForm.userId || undefined,
      requestId: ticketForm.requestId || undefined,
      incidentId: ticketForm.incidentId || undefined,
    });
    setSelectedTicket(created);
    setTicketForm({ title: "", description: "", category: "ACCESS", priority: "MEDIUM", businessId: "", userId: "", requestId: "", incidentId: "" });
    setMessage("Ticket creado y auditado.");
    await load();
  }

  async function updateTicket(status: string) {
    if (!selectedTicket) return;
    const updated = await adminService.updateSupportTicket(selectedTicket.id, { status, reason });
    setSelectedTicket(updated);
    setMessage("Ticket actualizado.");
    await load();
  }

  async function addNote() {
    if (!selectedTicket || !note.trim()) return;
    await adminService.addSupportTicketNote(selectedTicket.id, note);
    setNote("");
    setSelectedTicket(await adminService.updateSupportTicket(selectedTicket.id, { reason, status: selectedTicket.status }));
    setMessage("Nota interna agregada.");
  }

  async function loadUser(id: string, cashier = false) {
    setDetail(cashier ? await adminService.getSupportCashier360(id, reason, selectedTicket?.id) : await adminService.getSupportUser360(id, reason, selectedTicket?.id));
  }

  async function loadBusiness(id: string) {
    setDetail(await adminService.getSupportBusiness(id, reason, selectedTicket?.id));
  }

  async function tool(action: "reset" | "revoke" | "unlock", userId: string) {
    if (!selectedTicket) {
      setMessage("Selecciona o crea un ticket activo antes de ejecutar herramientas.");
      return;
    }
    if (action === "reset") await adminService.supportSendPasswordReset(userId, reason, selectedTicket.id);
    if (action === "revoke") await adminService.supportRevokeAllSessions(userId, reason, selectedTicket.id);
    if (action === "unlock") await adminService.supportUnlockUser(userId, reason, selectedTicket.id);
    setMessage("Herramienta ejecutada con auditoría.");
    await loadUser(userId);
  }

  async function requestImpersonation() {
    if (!selectedTicket) return setMessage("Impersonation requiere ticket activo.");
    const result = await adminService.requestSupportImpersonation(reason, selectedTicket.id);
    setMessage(result.reason);
  }

  return (
    <div className="page">
      <p className="eyebrow">Operación SaaS Enterprise</p>
      <h1 className="title">Soporte Enterprise</h1>
      <p className="subtitle">Herramientas controladas, auditadas y con datos sensibles enmascarados.</p>
      {message && <p className="mt-4 rounded-2xl bg-violet-50 p-4 font-bold text-violet-800">{message}</p>}

      <section className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {dashboard && Object.entries(dashboard.summary).map(([key, value]) => (
          <div key={key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">{key}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value ?? "—"}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <section className="panel">
          <h2 className="text-xl font-black">Buscador unificado</h2>
          <form onSubmit={doSearch} className="mt-4 grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
            <input className="input" placeholder="Usuario, comercio, ticket, request ID, transacción..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <input className="input" placeholder="Motivo obligatorio de acceso" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="primary">Buscar</button>
          </form>
          {results && (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Result title="Usuarios" rows={results.users} render={(u: any) => <button className="result-card" onClick={() => loadUser(u.id)}><b>{u.name}</b><span>{u.email} · {u.role} · {u.status}</span></button>} />
              <Result title="Comercios" rows={results.businesses} render={(b: any) => <button className="result-card" onClick={() => loadBusiness(b.id)}><b>{b.name}</b><span>{b.email} · {b.status}</span></button>} />
              <Result title="Tickets" rows={results.tickets} render={(t: SupportTicket) => <button className="result-card" onClick={() => setSelectedTicket(t)}><b>{t.title}</b><span>{t.priority} · {t.status}</span></button>} />
              <Result title="Errores / Incidentes" rows={[...results.errors, ...results.incidents]} render={(r: any) => <div className="result-card"><b>{r.title ?? r.type}</b><span>{r.status} · {r.requestId ?? r.service ?? "sin request"}</span></div>} />
            </div>
          )}
        </section>

        <section className="panel">
          <h2 className="text-xl font-black">Crear ticket</h2>
          <form onSubmit={createTicket} className="mt-4 space-y-3">
            <input className="input" placeholder="Título" value={ticketForm.title} onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })} required />
            <textarea className="input min-h-24" placeholder="Descripción" value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} required />
            <div className="grid gap-3 md:grid-cols-2">
              <select className="input" value={ticketForm.category} onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
              <select className="input" value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}>{priorities.map((p) => <option key={p}>{p}</option>)}</select>
            </div>
            <input className="input" placeholder="Business ID opcional" value={ticketForm.businessId} onChange={(e) => setTicketForm({ ...ticketForm, businessId: e.target.value })} />
            <input className="input" placeholder="User ID opcional" value={ticketForm.userId} onChange={(e) => setTicketForm({ ...ticketForm, userId: e.target.value })} />
            <input className="input" placeholder="Request ID opcional" value={ticketForm.requestId} onChange={(e) => setTicketForm({ ...ticketForm, requestId: e.target.value })} />
            <button className="primary w-full">Crear ticket auditado</button>
          </form>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
        <section className="panel">
          <h2 className="text-xl font-black">Tickets abiertos</h2>
          <div className="mt-4 space-y-2">
            {openTickets.map((t) => (
              <button key={t.id} className={`w-full rounded-2xl border p-4 text-left ${selectedTicket?.id === t.id ? "border-violet-500 bg-violet-50" : "border-slate-200"}`} onClick={() => setSelectedTicket(t)}>
                <b>{t.title}</b>
                <span className="block text-sm text-slate-500">{t.priority} · {t.status} · SLA {t.slaResolutionDue ? new Date(t.slaResolutionDue).toLocaleString("es-CL") : "sin dato"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="text-xl font-black">Ficha 360° / Ticket</h2>
          {selectedTicket && (
            <div className="mt-4 rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-black text-slate-400">{selectedTicket.id}</p>
              <h3 className="text-2xl font-black">{selectedTicket.title}</h3>
              <p className="mt-2 text-slate-600">{selectedTicket.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {statuses.map((s) => <button key={s} className={selectedTicket.status === s ? "primary" : "secondary"} onClick={() => updateTicket(s)}>{s}</button>)}
              </div>
              <div className="mt-4 flex gap-2">
                <textarea className="input min-h-20" placeholder="Nota interna sin secretos" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="secondary" onClick={addNote}>Agregar nota</button>
              </div>
              <button className="secondary mt-4" onClick={requestImpersonation}>Solicitar impersonation limitada</button>
            </div>
          )}
          {detail && (
            <div className="mt-5 space-y-4">
              <pre className="max-h-[460px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(detail, null, 2)}</pre>
              {detail.user?.id && (
                <div className="flex flex-wrap gap-2">
                  <button className="secondary" onClick={() => tool("reset", detail.user.id)}>Enviar recuperación</button>
                  <button className="secondary" onClick={() => tool("revoke", detail.user.id)}>Revocar sesiones</button>
                  <button className="secondary" onClick={() => tool("unlock", detail.user.id)}>Desbloquear</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <InfoPanel title="SLA operativo" rows={sla} />
        <InfoPanel title="Macros publicadas" rows={macros} />
        <InfoPanel title="Base de conocimiento" rows={articles} />
      </div>
    </div>
  );
}

function Result({ title, rows, render }: { title: string; rows: any[]; render: (row: any) => any }) {
  return <div><h3 className="font-black">{title}</h3><div className="mt-2 space-y-2">{rows.length ? rows.map((row) => <div key={row.id}>{render(row)}</div>) : <p className="text-sm text-slate-500">Sin resultados.</p>}</div></div>;
}

function InfoPanel({ title, rows }: { title: string; rows: any[] }) {
  return <section className="panel"><h2 className="text-lg font-black">{title}</h2><div className="mt-3 space-y-2">{rows.length ? rows.map((row) => <div key={row.id ?? row.priority} className="rounded-2xl bg-slate-50 p-3 text-sm"><b>{row.title ?? row.priority}</b><p className="text-slate-500">{row.body ?? row.category ?? `${row.firstResponseMinutes} / ${row.resolutionMinutes} min`}</p></div>) : <p className="text-sm text-slate-500">Sin datos configurados todavía.</p>}</div></section>;
}
