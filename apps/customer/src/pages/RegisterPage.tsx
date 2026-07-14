import { FormEvent, useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { customerService } from "../services/customer.service";
import { CustomerRegistration } from "../types/customer";
export function RegisterPage() {
  const [params] = useSearchParams();
  const businessSlug = params.get("business") ?? undefined;
  const [data, setData] = useState<CustomerRegistration>({
      name: "",
      phone: "",
      email: "",
      birthDate: "",
      rut: "",
      password: "",
      businessSlug,
    }),
    [showPassword, setShowPassword] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  function set(field: keyof CustomerRegistration, value: string) {
    setData((c) => ({ ...c, [field]: value }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (data.password.length < 4)
        throw new Error("La contraseña debe tener al menos 4 caracteres");
      await customerService.register({ ...data, phone: `+569${data.phone}` });
      navigate(businessSlug ? `/login?business=${encodeURIComponent(businessSlug)}` : "/login", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear tu cuenta");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen bg-white p-6 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link
        to="/welcome"
        className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"
      >
        <ArrowLeft />
      </Link>
      <div className="mx-auto mt-8 max-w-sm">
        <p className="font-bold text-violet-600">Tu cuenta MiClub</p>
        <h1 className="mt-2 text-3xl font-black">Crear cuenta</h1>
        <p className="mt-2 text-slate-500">
          {businessSlug
            ? "Regístrate para comenzar a acumular en este comercio."
            : "Empieza a reunir tus beneficios en un solo lugar."}
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold" htmlFor="customer-register-name">
            Nombre completo
            <input
              id="customer-register-name"
              className="input"
              value={data.name}
              onChange={(e) =>
                set(
                  "name",
                  e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, ""),
                )
              }
              pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+"
              required
            />
          </label>
          <label className="block text-sm font-semibold" htmlFor="customer-register-phone">
            Teléfono
            <span className="flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:ring-2 focus-within:ring-violet-500">
              <span className="font-bold text-slate-500">+569</span>
              <input
                id="customer-register-phone"
                className="min-h-12 w-full border-0 px-1 outline-none"
                type="tel"
                inputMode="numeric"
                maxLength={8}
                pattern="[0-9]{8}"
                placeholder="XXXXXXXX"
                value={data.phone}
                onChange={(e) =>
                  set("phone", e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                required
              />
            </span>
          </label>
          <label className="block text-sm font-semibold" htmlFor="customer-register-email">
            Correo electrónico
            <input
              id="customer-register-email"
              className="input"
              type="email"
              value={data.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-semibold" htmlFor="customer-register-birth-date">
            Fecha de nacimiento{" "}
            <span className="font-normal text-slate-400">(opcional)</span>
            <input
              id="customer-register-birth-date"
              className="input"
              type="date"
              value={data.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold" htmlFor="customer-register-rut">
            RUT <span className="font-normal text-slate-400">(opcional)</span>
            <input
              id="customer-register-rut"
              className="input"
              value={data.rut}
              onChange={(e) => set("rut", e.target.value)}
              placeholder="12.345.678-9"
            />
          </label>
          <label className="block text-sm font-semibold" htmlFor="customer-register-password">
            Contraseña
            <span className="relative block">
              <input
                id="customer-register-password"
                className="input pr-12"
                type={showPassword ? "text" : "password"}
                minLength={4}
                value={data.password}
                onChange={(e) => set("password", e.target.value)}
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
            <small className="mt-1 block font-normal text-slate-400">
              Usa al menos 4 caracteres
            </small>
          </label>
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
            className="w-full rounded-2xl bg-slate-950 py-4 font-bold text-white"
          >
            {loading ? "Creando cuenta…" : "Crear mi cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}
