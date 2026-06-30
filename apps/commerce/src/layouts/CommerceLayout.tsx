import {
  BarChart3,
  Gift,
  LogOut,
  QrCode,
  Settings,
  Users,
  UserRoundCog,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
const nav = [
  ["/dashboard", "Dashboard", BarChart3],
  ["/program", "Programa", Gift],
  ["/customers", "Clientes", Users],
  ["/collaborators", "Colaboradores", UserRoundCog],
  ["/rewards", "Recompensas", Gift],
  ["/qr-material", "Material QR", QrCode],
  ["/settings", "Ajustes", Settings],
] as const;
export function CommerceLayout({
  businessName,
  onLogout,
}: {
  businessName: string;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:w-[260px] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src="/logo-miclub-chile.jpeg" alt="MiClub Chile" className="h-12 w-20 rounded-xl object-contain" />
          <div>
            <strong className="block">{businessName}</strong>
            <small className="text-slate-400">MiClub Comercio</small>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={onLogout}
          className="hidden items-center gap-3 px-7 py-4 text-sm font-bold text-red-600 lg:absolute lg:bottom-4 lg:flex"
        >
          <LogOut size={18} /> Cerrar sesión
        </button>
      </aside>
      <main className="min-w-0 lg:col-start-2">
        <Outlet />
      </main>
    </div>
  );
}
