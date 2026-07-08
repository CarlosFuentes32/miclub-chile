import { useEffect, useState } from "react";
import { AuthUser, logout, portalByRole, restoreSession } from "@miclub/shared";
import { ForcePasswordChange } from "@miclub/ui";
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";
import { BusinessesPage } from "./pages/BusinessesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PlansPage } from "./pages/PlansPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SuperAuditPage } from "./pages/SuperAuditPage";
import { SuperCashiersPage } from "./pages/SuperCashiersPage";
import { SuperCustomersPage } from "./pages/SuperCustomersPage";
import { SuperDashboardPage } from "./pages/SuperDashboardPage";
import { SuperMaintenancePage } from "./pages/SuperMaintenancePage";
import { SuperSettingsPage } from "./pages/SuperSettingsPage";
import { SupportPage } from "./pages/SupportPage";
import { UsersPage } from "./pages/UsersPage";
import { adminService } from "./services/admin.service";
import { AdminDashboard, GlobalSettings, Reports } from "./types/admin";
function Protected({ user }: { user: AuthUser | null }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "MICLUB_ADMIN" && user.role !== "SUPER_ADMIN")
    return (
      <main className="grid min-h-screen place-items-center">
        <div>
          <h1>Sin permiso</h1>
          <a href={portalByRole[user.role]}>Ir al portal autorizado</a>
        </div>
      </main>
    );
  return <Outlet />;
}
function AppRoutes() {
  const [user, setUser] = useState<AuthUser | null>(null),
    [ready, setReady] = useState(false),
    [dashboard, setDashboard] = useState<AdminDashboard | null>(null),
    [reports, setReports] = useState<Reports | null>(null),
    [settings, setSettings] = useState<GlobalSettings | null>(null),
    [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    restoreSession()
      .then(async (session) => {
        if (session.role !== "MICLUB_ADMIN" && session.role !== "SUPER_ADMIN") {
          await logout();
          setUser(null);
          return;
        }
        setUser(session);
      })
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (user && !user.forcePasswordChange)
      Promise.all([
        adminService.getAdminDashboard(),
        adminService.getReports(),
        adminService.getGlobalSettings(),
      ])
        .then(([d, r, s]) => {
          setDashboard(d);
          setReports(r);
          setSettings(s);
        })
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Error de conexión"),
        );
  }, [user]);
  async function out() {
    await logout();
    setUser(null);
    navigate("/login", { replace: true });
  }
  if (!ready)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        Preparando administración…
      </main>
    );
  if (!user)
    return (
      <Routes>
        <Route path="*" element={<LoginPage onLogin={setUser} />} />
      </Routes>
    );
  if (user.forcePasswordChange) return <ForcePasswordChange onComplete={out} />;
  if (!dashboard || !reports || !settings)
    return (
      <main className="grid min-h-screen place-items-center">
        {error || "Cargando administración…"}
      </main>
    );
  return (
    <Routes>
      <Route element={<Protected user={user} />}>
        {" "}
        <Route element={<AdminLayout user={user} onLogout={out} />}>
          {" "}
          <Route
            path="/dashboard"
            element={<DashboardPage data={dashboard} />}
          />
          <Route path="/businesses" element={<BusinessesPage />} />
          <Route path="/users" element={<UsersPage />} />
          {user.role === "SUPER_ADMIN" && (
            <>
              <Route path="/super" element={<SuperDashboardPage />} />
              <Route path="/customers" element={<SuperCustomersPage />} />
              <Route path="/cashiers" element={<SuperCashiersPage />} />
              <Route path="/audit" element={<SuperAuditPage />} />
              <Route path="/super-settings" element={<SuperSettingsPage />} />
              <Route path="/maintenance" element={<SuperMaintenancePage />} />
            </>
          )}
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/reports" element={<ReportsPage data={reports} />} />
          <Route path="/support" element={<SupportPage />} />
          <Route
            path="/settings"
            element={
              <SettingsPage settings={settings} onChange={setSettings} />
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
