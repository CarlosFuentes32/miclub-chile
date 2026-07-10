import { FormEvent, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import {
  formatearTelefonoChile,
  soloNombre,
  telefonoLocal,
  validarEmail,
  validarNombre,
  validarTelefonoChile,
} from "@miclub/shared";

export const whatsappUrl =
  "https://wa.me/56995026368?text=Hola%2C%20quiero%20cotizar%20MiClub%20Chile%20para%20mi%20comercio";

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? "https://api.miclubchile.cl/api"
    : "http://localhost:3000/api");

export function AccessForm() {
  const [data, setData] = useState({
    name: "",
    phone: "",
    email: "",
    business: "",
    industry: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof data, value: string) => {
    setData((v) => ({ ...v, [key]: value }));
    setError("");
    setSent(false);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validarNombre(data.name))
      return setError("Ingresa tu nombre completo usando solo letras.");
    if (!validarTelefonoChile(data.phone))
      return setError("Ingresa los 8 dígitos de tu teléfono móvil.");
    if (!validarEmail(data.email))
      return setError("Ingresa un correo electrónico válido.");

    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          phone: formatearTelefonoChile(data.phone),
          source: "landing",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          Array.isArray(body.message)
            ? body.message.join(", ")
            : body.message || "No pudimos registrar tu solicitud.",
        );
      }
      setSent(true);
      setData({
        name: "",
        phone: "",
        email: "",
        business: "",
        industry: "",
        message: "",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos registrar tu solicitud. Intenta nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="access-form">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="form-field">
          Nombre completo
          <input
            value={data.name}
            onChange={(e) => set("name", soloNombre(e.target.value))}
            autoComplete="name"
            required
          />
        </label>
        <label className="form-field">
          Teléfono
          <span className="phone-control">
            <b>+569</b>
            <input
              value={telefonoLocal(data.phone)}
              onChange={(e) => set("phone", formatearTelefonoChile(e.target.value))}
              inputMode="numeric"
              pattern="[0-9]{8}"
              maxLength={8}
              placeholder="XXXXXXXX"
              autoComplete="tel"
              required
            />
          </span>
        </label>
        <label className="form-field">
          Correo
          <input
            type="email"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
            placeholder="nombre@comercio.cl"
            required
          />
        </label>
        <label className="form-field">
          Nombre del comercio
          <input value={data.business} onChange={(e) => set("business", e.target.value)} required />
        </label>
        <label className="form-field md:col-span-2">
          Rubro
          <input
            value={data.industry}
            onChange={(e) => set("industry", e.target.value)}
            placeholder="Ej. minimarket, cafetería o barbería"
            required
          />
        </label>
        <label className="form-field md:col-span-2">
          Mensaje
          <textarea
            value={data.message}
            onChange={(e) => set("message", e.target.value)}
            rows={4}
            placeholder="Cuéntanos brevemente qué necesitas"
            required
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {sent && (
        <p role="status" className="form-success">
          Solicitud recibida correctamente. Te contactaremos a la brevedad.
        </p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button className="button-primary" type="submit" disabled={busy}>
          <Send size={18} /> {busy ? "Enviando…" : "Enviar solicitud"}
        </button>
        <a className="button-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">
          <MessageCircle size={19} /> Cotizar por WhatsApp
        </a>
      </div>
    </form>
  );
}
