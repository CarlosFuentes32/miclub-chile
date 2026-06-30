import {
  BarChart3,
  Building2,
  Headphones,
  Layers3,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
const nav = [
  ["/dashboard", "Dashboard", BarChart3],
  ["/businesses", "Comercios", Building2],
  ["/users", "Usuarios", Users],
  ["/plans", "Planes", Layers3],
  ["/reports", "Reportes", BarChart3],
  ["/support", "Soporte", Headphones],
  ["/settings", "Configuración", Settings],
] as const;
export function AdminLayout({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-200 bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:w-[260px]">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src="/logo-miclub-chile.jpeg" alt="MiClub Chile" className="h-12 w-20 rounded-xl bg-white object-contain" />
          <div>
            <strong>MiClub Admin</strong>
            <small className="block text-slate-400">Control global</small>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${isActive ? "bg-violet-500 text-white" : "text-slate-400 hover:bg-white/5"}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={onLogout}
          className="hidden items-center gap-3 px-7 py-4 text-sm font-bold text-red-300 lg:absolute lg:bottom-4 lg:flex"
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
