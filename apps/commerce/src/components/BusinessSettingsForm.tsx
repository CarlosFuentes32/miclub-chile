import { FormEvent, useState } from "react";
import {
  CHILE_REGIONS,
  formatearRutEmpresa,
  formatearTelefonoChile,
  telefonoLocal,
  validarEmail,
  validarRutEmpresa,
  validarTelefonoChile,
} from "@miclub/shared";
import { BusinessSettings } from "../types/commerce";
export function BusinessSettingsForm({
  settings,
  onSave,
}: {
  settings: BusinessSettings;
  onSave: (v: BusinessSettings) => Promise<unknown>;
}) {
  const [value, setValue] = useState(settings),
    [message, setMessage] = useState("");
  const set = (k: keyof BusinessSettings, v: string) =>
    setValue((c) => ({
      ...c,
      [k]: v,
      ...(k === "region" ? { commune: "" } : {}),
    }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (value.rut && !validarRutEmpresa(value.rut))
      return setMessage("Ingresa un RUT válido.");
    if (!validarTelefonoChile(value.phone))
      return setMessage("El teléfono debe tener 8 dígitos.");
    if (!validarEmail(value.email))
      return setMessage("Ingresa un correo válido.");
    await onSave(value);
    setMessage("Cambios guardados ✓");
  }
  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <label className="field">
        Nombre del comercio
        <input
          className="input"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </label>
      <label className="field">
        Rubro
        <input
          className="input"
          value={value.category}
          onChange={(e) => set("category", e.target.value)}
          required
        />
      </label>
      <label className="field">
        RUT empresa
        <input
          className="input"
          value={value.rut ?? ""}
          readOnly
          disabled
        />
        <small>El RUT del comercio no puede modificarse desde este panel. Contacte al administrador.</small>
      </label>
      <label className="field">
        Teléfono
        <span className="phone-field">
          <b>+569</b>
          <input
            className="input"
            inputMode="numeric"
            maxLength={8}
            value={telefonoLocal(value.phone)}
            onChange={(e) =>
              set("phone", formatearTelefonoChile(e.target.value))
            }
            required
          />
        </span>
      </label>
      <label className="field">
        Región
        <select
          className="input"
          value={value.region ?? ""}
          onChange={(e) => set("region", e.target.value)}
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
          value={value.commune ?? ""}
          onChange={(e) => set("commune", e.target.value)}
          required
          disabled={!value.region}
        >
          <option value="">Selecciona una comuna</option>
          {(CHILE_REGIONS[value.region ?? ""] ?? []).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label className="field md:col-span-2">
        Dirección
        <input
          className="input"
          value={value.address}
          onChange={(e) => set("address", e.target.value)}
          required
        />
      </label>
      <label className="field">
        Correo
        <input
          className="input"
          type="email"
          value={value.email}
          onChange={(e) => set("email", e.target.value)}
          required
        />
      </label>
      <label className="field">
        Logo (URL opcional)
        <input
          className="input"
          value={value.logoUrl ?? ""}
          onChange={(e) => set("logoUrl", e.target.value)}
        />
      </label>
      {message && (
        <p className="rounded-2xl bg-violet-50 p-4 font-bold text-violet-800 md:col-span-2">
          {message}
        </p>
      )}
      <button className="primary md:col-span-2">Guardar configuración</button>
    </form>
  );
}
