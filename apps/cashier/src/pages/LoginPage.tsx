import { AuthUser, login } from "@miclub/shared";
import { FormEvent, useState } from "react";
export function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState(
      import.meta.env.DEV ? "cashier@miclub.local" : "",
    ),
    [password, setPassword] = useState(
      import.meta.env.DEV ? (import.meta.env.VITE_DEV_PASSWORD ?? "") : "",
    ),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(email, password);
      if (user.role !== "CASHIER") {
        setError("Esta cuenta no tiene acceso al panel cajero.");
        return;
      }
      onLogin(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos iniciar sesión");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="auth-shell">
      <form
        onSubmit={submit}
        className="auth-card"
      >
        <img src="/logo-miclub-chile-transparent.png" alt="MiClub Chile" className="auth-logo" />
        <p className="mt-6 text-sm font-black uppercase tracking-wider text-violet-600">
          MiClub Chile
        </p>
        <h1 className="mt-1 text-3xl font-black">Acceso cajero</h1>
        <p className="mt-2 text-sm text-slate-500">
          Registra compras y canjes en segundos.
        </p>
        <label className="mt-7 block text-sm font-bold" htmlFor="cashier-login-email">
          Correo
          <input
            id="cashier-login-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-bold" htmlFor="cashier-login-password">
          Contraseña
          <input
            id="cashier-login-password"
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
        <button
          disabled={loading}
          className="mt-5 min-h-14 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-700 font-black text-white shadow-lg shadow-violet-200 disabled:opacity-50"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
