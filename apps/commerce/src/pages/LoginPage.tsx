import { AuthUser, login } from "@miclub/shared";
import { FormEvent, useState } from "react";
export function LoginPage({ onLogin }: { onLogin: (u: AuthUser) => void }) {
  const [email, setEmail] = useState(
      import.meta.env.DEV ? "owner@miclub.local" : "",
    ),
    [password, setPassword] = useState(
      import.meta.env.DEV ? (import.meta.env.VITE_DEV_PASSWORD ?? "") : "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(email, password);
      if (!["BUSINESS_OWNER", "BUSINESS_ADMIN"].includes(u.role)) {
        setError("Esta cuenta no tiene acceso al panel comercio.");
        return;
      }
      onLogin(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos iniciar sesión");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <form
        onSubmit={submit}
        className="auth-card"
      >
        <img src="/logo-miclub-chile-transparent.png" alt="MiClub Chile" className="auth-logo" />
        <p className="mt-6 text-sm font-black uppercase tracking-wider text-violet-700">
          MiClub Chile
        </p>
        <h1 className="mt-1 text-3xl font-black">Panel Comercio</h1>
        <p className="mt-2 text-sm text-slate-500">
          Gestiona tu programa y tus clientes.
        </p>
        <label className="field mt-7" htmlFor="commerce-login-email">
          Correo
          <input
            id="commerce-login-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field mt-4" htmlFor="commerce-login-password">
          Contraseña
          <input
            id="commerce-login-password"
            className="input"
            type="password"
            minLength={4}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        )}
        <button disabled={busy} className="primary mt-5 w-full">
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
