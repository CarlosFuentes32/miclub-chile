import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { BusinessDetailPanel } from "../components/BusinessDetailPanel";
import { BusinessesTable } from "../components/BusinessesTable";
import { CreateBusinessForm } from "../components/CreateBusinessForm";
import { adminService } from "../services/admin.service";
import {
  AdminBusiness,
  BusinessStatus,
  CreateBusinessInput,
  Plan,
} from "../types/admin";

export function BusinessesPage() {
  const [items, setItems] = useState<AdminBusiness[]>([]),
    [plans, setPlans] = useState<Plan[]>([]),
    [selected, setSelected] = useState<AdminBusiness | null>(null),
    [creating, setCreating] = useState(false),
    [created, setCreated] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [category, setCategory] = useState("");
  async function load() {
    setItems(await adminService.getBusinesses());
  }
  useEffect(() => {
    void load();
    adminService.getPlans().then(setPlans);
  }, []);
  const visible = useMemo(
    () =>
      items.filter(
        (b) =>
          b.name.toLowerCase().includes(query.toLowerCase()) &&
          (!status || b.status === status) &&
          (!category || b.category === category),
      ),
    [items, query, status, category],
  );
  async function update(s: BusinessStatus) {
    if (!selected) return;
    const b = await adminService.updateBusinessStatus(selected.id, s);
    setItems((v) => v.map((x) => (x.id === b.id ? b : x)));
    setSelected(b);
  }
  async function saveBusiness(input: {
    name: string;
    businessType: string;
    rutBusiness?: string;
    phone: string;
    email: string;
    planId: string;
  }) {
    if (!selected) return;
    const b = await adminService.updateBusiness(selected.id, input);
    setItems((v) => v.map((x) => (x.id === b.id ? b : x)));
    setSelected(b);
  }
  async function remove() {
    if (
      !selected ||
      !window.confirm(
        "Acción delicada: el comercio perderá acceso, pero sus datos históricos se conservarán. ¿Continuar?",
      )
    )
      return;
    await adminService.deleteBusiness(selected.id);
    await load();
    setSelected(null);
  }
  async function create(input: CreateBusinessInput) {
    await adminService.createBusiness(input);
    await load();
    setCreating(false);
    setCreated(
      `Comercio creado. El dueño puede ingresar con ${input.ownerEmail}.`,
    );
  }
  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Gestión de cuentas</p>
          <h1 className="title">Comercios</h1>
        </div>
        <button onClick={() => setCreating(true)} className="primary">
          <Plus size={18} /> Crear comercio
        </button>
      </div>
      {created && (
        <p className="mt-5 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          {created}
        </p>
      )}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <input
          className="input mt-0"
          placeholder="Buscar por nombre"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input mt-0"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
          <option value="grace_period">Período de gracia</option>
          <option value="cancelled">Cancelados</option>
          <option value="deleted">Eliminados</option>
        </select>
        <select
          className="input mt-0"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todos los rubros</option>
          {[...new Set(items.map((b) => b.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        <BusinessesTable items={visible} onSelect={setSelected} />
      </div>
      {selected && (
        <BusinessDetailPanel
          business={selected}
          plans={plans}
          onClose={() => setSelected(null)}
          onSave={saveBusiness}
          onStatus={update}
          onDelete={remove}
          onRestore={async () => {
            if (!selected) return;
            await adminService.restoreBusiness(selected.id);
            await load();
            setSelected(null);
          }}
        />
      )}{" "}
      {creating && (
        <CreateBusinessForm
          plans={plans}
          onCancel={() => setCreating(false)}
          onCreate={create}
        />
      )}
    </div>
  );
}
