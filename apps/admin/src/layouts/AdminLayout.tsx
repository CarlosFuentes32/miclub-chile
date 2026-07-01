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
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-white/10 bg-gradient-to-b from-slate-950 via-violet-950 to-slate-950 text-white lg:fixed lg:inset-y-0 lg:w-[280px]">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src="/logo-miclub-chile-icon.png" alt="MiClub Chile" className="h-16 w-16 object-contain" />
          <div>
            <strong>MiClub Admin</strong>
            <small className="block text-cyan-300">Control global</small>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive ? "bg-white text-violet-800 shadow-lg" : "text-slate-300 hover:bg-white/10 hover:text-white"}`
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
