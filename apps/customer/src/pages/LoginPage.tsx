import { FormEvent, useState } from "react";
import { formatearTelefonoChile, login, telefonoLocal } from "@miclub/shared";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
export function LoginPage({
  onLogin,
}: {
  onLogin: (user: Awaited<ReturnType<typeof login>>) => void;
}) {
  const [identifier, setIdentifier] = useState(
      import.meta.env.DEV ? "customer@miclub.local" : "",
    ),
    [password, setPassword] = useState(
      import.meta.env.DEV ? (import.meta.env.VITE_DEV_PASSWORD ?? "") : "",
    ),
    [showPassword, setShowPassword] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const businessSlug = params.get('business');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(formatearTelefonoChile(identifier), password);
      if (user.role !== "CUSTOMER") {
        setError("Esta cuenta no tiene acceso al panel cliente.");
        return;
      }
      onLogin(user);
      navigate(businessSlug ? `/join?business=${encodeURIComponent(businessSlug)}` : "/app", { replace: true });
    } catch (e) {
      const message=e instanceof Error?e.message:"No pudimos iniciar sesión";setError(message.includes("Correo o contraseña")?"Teléfono o contraseña incorrecta.":message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-violet-50/50 p-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link
        to="/welcome"
        className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"
      >
        <ArrowLeft />
      </Link>
      <div className="mx-auto mt-10 max-w-sm">
        <img
          src="/logo-miclub-chile-transparent.png"
          alt="MiClub Chile"
          className="auth-logo mb-6"
        />
        <p className="font-bold text-violet-600">Bienvenido de vuelta</p>
        <h1 className="mt-2 text-3xl font-black">Ingresa a MiClub</h1>
        <p className="mt-2 text-slate-500">
          Tus beneficios te están esperando.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold">
            Teléfono
            <span className="phone-field">
              <b>+569</b>
              <input
                className="input"
                inputMode="numeric"
                pattern="[0-9]{8}"
                maxLength={8}
                value={telefonoLocal(identifier)}
                onChange={(e) =>
                  setIdentifier(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                required
              />
            </span>
          </label>
          <label className="block text-sm font-semibold">
            Contraseña
            <span className="relative block">
              <input
                className="input pr-12"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={4}
                required
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
            <button
              type="button"
              className="mt-2 text-sm font-bold text-violet-700"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            </button>
          </label>
          <Link to="/recover-password" className="block text-right text-sm font-bold text-violet-700">¿Olvidaste tu contraseña?</Link>
          {error && (
            <p
              role="alert"
              className="rounded-2xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="brand-button w-full"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Aún no tienes cuenta?{" "}
          <Link to={businessSlug ? `/register?business=${encodeURIComponent(businessSlug)}` : "/register"} className="font-bold text-violet-700">
            Créala aquí
          </Link>
        </p>
      </div>
    </main>
  );
}
