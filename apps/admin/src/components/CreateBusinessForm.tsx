import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  CHILE_REGIONS,
  formatearRutEmpresa,
  formatearTelefonoChile,
  soloNombre,
  telefonoLocal,
  validarEmail,
  validarPassword,
  validarRutEmpresa,
  validarTelefonoChile,
} from "@miclub/shared";
import { CreateBusinessInput, Plan } from "../types/admin";
const Phone = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <span className="phone-field">
    <b>+569</b>
    <input
      className="input"
      inputMode="numeric"
      pattern="[0-9]{8}"
      maxLength={8}
      value={telefonoLocal(value)}
      onChange={(e) => onChange(formatearTelefonoChile(e.target.value))}
      placeholder="XXXXXXXX"
      required
    />
  </span>
);
export function CreateBusinessForm({
  plans,
  onCreate,
  onCancel,
}: {
  plans: Plan[];
  onCreate: (v: CreateBusinessInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [field, setField] = useState<CreateBusinessInput>({
    name: "",
    businessType: "Minimarket",
    rutBusiness: "",
    address: "",
    region: "",
    commune: "",
    phone: "+569",
    email: "",
    planId: plans[0]?.id ?? "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "+569",
    ownerPassword: "",
  });
  const [confirm, setConfirm] = useState(""),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const change = (key: keyof CreateBusinessInput, value: string) =>
    setField((v) => ({
      ...v,
      [key]: value,
      ...(key === "region" ? { commune: "" } : {}),
    }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (field.rutBusiness && !validarRutEmpresa(field.rutBusiness))
      return setError("Ingresa un RUT de empresa válido.");
    if (
      !validarTelefonoChile(field.phone) ||
      !validarTelefonoChile(field.ownerPhone)
    )
      return setError("Los teléfonos deben contener 8 dígitos.");
    if (!validarEmail(field.email) || !validarEmail(field.ownerEmail))
      return setError("Ingresa un correo válido.");
    if (!validarPassword(field.ownerPassword))
      return setError("La contraseña debe tener al menos 4 caracteres.");
    if (field.ownerPassword !== confirm)
      return setError("Las contraseñas no coinciden.");
    setBusy(true);
    try {
      await onCreate(field);
    } catch (x) {
      setError(x instanceof Error ? x.message : "No se pudo crear el comercio");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4">
      <form
        onSubmit={submit}
        autoComplete="off"
        className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Alta comercial</p>
            <h2 className="text-2xl font-black">Nuevo comercio</h2>
          </div>
          <button type="button" onClick={onCancel} className="secondary">
            Cerrar
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="field">
            Nombre del comercio
            <input
              className="input"
              value={field.name}
              onChange={(e) => change("name", e.target.value)}
              required
            />
          </label>
          <label className="field">
            Rubro
            <input
              className="input"
              value={field.businessType}
              onChange={(e) => change("businessType", e.target.value)}
              required
            />
          </label>
          <label className="field">
            RUT de empresa <span>(opcional)</span>
            <input
              className="input"
              value={field.rutBusiness}
              onChange={(e) =>
                change("rutBusiness", formatearRutEmpresa(e.target.value))
              }
              placeholder="12.345.678-9"
            />
          </label>
          <label className="field">
            Plan
            <select
              className="input"
              value={field.planId}
              onChange={(e) => change("planId", e.target.value)}
              required
            >
              <option value="">Seleccionar plan</option>
              {plans
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Teléfono comercio
            <Phone value={field.phone} onChange={(v) => change("phone", v)} />
          </label>
          <label className="field">
            Correo comercio
            <input
              className="input"
              type="email"
              value={field.email}
              onChange={(e) => change("email", e.target.value)}
              required
            />
          </label>
          <label className="field">
            Región
            <select
              className="input"
              value={field.region}
              onChange={(e) => change("region", e.target.value)}
              required
            >
              <option value="">Selecciona una región</option>
              {Object.keys(CHILE_REGIONS).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Comuna
            <select
              className="input"
              value={field.commune}
              onChange={(e) => change("commune", e.target.value)}
              disabled={!field.region}
              required
            >
              <option value="">Selecciona una comuna</option>
              {(CHILE_REGIONS[field.region] ?? []).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="field md:col-span-2">
            Dirección
            <input
              className="input"
              value={field.address}
              onChange={(e) => change("address", e.target.value)}
              required
            />
          </label>
        </div>
        <h3 className="mt-7 text-lg font-black">Datos de administrador</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="field">
            Nombre
            <input
              className="input"
              value={field.ownerName}
              onChange={(e) => change("ownerName", soloNombre(e.target.value))}
              required
            />
          </label>
          <label className="field">
            Correo de acceso
            <input
              className="input"
              type="email"
              value={field.ownerEmail}
              onChange={(e) => change("ownerEmail", e.target.value)}
              required
            />
          </label>
          <label className="field">
            Teléfono
            <Phone
              value={field.ownerPhone}
              onChange={(v) => change("ownerPhone", v)}
            />
          </label>
          <label className="field">
            Contraseña
            <span className="relative block">
              <input
                className="input pr-12"
                type={show ? "text" : "password"}
                name="new-business-owner-password"
                autoComplete="new-password"
                minLength={4}
                value={field.ownerPassword}
                onChange={(e) => change("ownerPassword", e.target.value)}
                required
              />
              <button
                type="button"
                aria-label="Mostrar contraseña"
                className="eye"
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </label>
          <label className="field md:col-start-2">
            Confirmar contraseña
            <input
              className="input"
              type={show ? "text" : "password"}
              name="confirm-new-business-owner-password"
              autoComplete="new-password"
              minLength={4}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700"
          >
            {error}
          </p>
        )}
        <button disabled={busy} className="primary mt-6 w-full">
          {busy ? "Creando…" : "Crear comercio y administrador"}
        </button>
      </form>
    </div>
  );
}
