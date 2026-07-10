import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { customerService } from "../services/customer.service";

export function RecoverPasswordPage() {
  const token = useMemo(() => new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("token"), []);
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (token) {
        if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
        if (password !== confirm) throw new Error("Las contraseñas no coinciden.");
        const r = await customerService.confirmPasswordReset(token, password);
        setMessage(r.message);
      } else {
        const r = await customerService.requestPasswordReset(value);
        setMessage(r.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos completar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white p-6">
      <Link to="/login" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100">
        <ArrowLeft />
      </Link>
      <form onSubmit={submit} className="mx-auto mt-10 max-w-sm">
        <img src="/logo-miclub-chile-transparent.png" alt="MiClub Chile" className="mx-auto h-28 w-auto rounded-2xl object-contain" />
        <h1 className="mt-6 text-3xl font-black">{token ? "Crear nueva contraseña" : "Recuperar contraseña"}</h1>
        <p className="mt-2 text-slate-500">
          {token ? "Ingresa y confirma tu nueva contraseña." : "Ingresa tu correo electrónico o teléfono."}
        </p>
        {token ? (
          <>
            <label className="mt-6 block text-sm font-semibold">
              Nueva contraseña
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Confirmar contraseña
              <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
            </label>
          </>
        ) : (
          <label className="mt-6 block text-sm font-semibold">
            Correo o teléfono
            <input className="input" value={value} onChange={(e) => setValue(e.target.value)} required />
          </label>
        )}
        {message && <p role="status" className="mt-4 rounded-2xl bg-cyan-50 p-4 text-sm font-semibold text-cyan-900">{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
        <button disabled={busy} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-700 py-4 font-bold text-white">
          {busy ? "Procesando…" : token ? "Guardar nueva contraseña" : "Solicitar recuperación"}
        </button>
      </form>
    </main>
  );
}
