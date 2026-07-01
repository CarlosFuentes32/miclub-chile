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
import { ActionResultMessage } from "./components/ActionResultMessage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RedeemPage } from "./pages/RedeemPage";
import { ScanPage } from "./pages/ScanPage";
import { SearchPage } from "./pages/SearchPage";
import { cashierService } from "./services/cashier.service";
import { ActionResult, CashierCustomer, CashierReward } from "./types/cashier";
function Protected({ user }: { user: AuthUser | null }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "CASHIER")
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="text-3xl font-black">Sin permiso</h1>
          <p className="mt-2">
            Solo los usuarios con rol cashier pueden ingresar.
          </p>
          <a
            href={portalByRole[user.role]}
            className="mt-5 inline-block font-bold text-violet-700"
          >
            Ir al portal autorizado
          </a>
        </div>
      </main>
    );
  return <Outlet />;
}
function AppRoutes() {
  const [user, setUser] = useState<AuthUser | null>(null),
    [ready, setReady] = useState(false),
    [result, setResult] = useState<ActionResult | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    restoreSession()
      .then(async (session) => {
        if (session.role !== "CASHIER") {
          await logout();
          setUser(null);
          return;
        }
        setUser(session);
      })
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);
  async function out() {
    await logout();
    cashierService.resetBusiness();
    setUser(null);
    navigate("/login", { replace: true });
  }
  async function register(customer: CashierCustomer) {
    try {
    const response = await cashierService.registerTransaction(customer.id);
    const remaining = Math.max(
      response.customer.goal - response.customer.current,
      0,
    );
    setResult({
      kind: "success",
      title: "Transacción registrada correctamente",
      description: `Ahora lleva ${response.customer.current} de ${response.customer.goal}`,
      detail: response.unlockedReward
        ? `Recompensa desbloqueada: ${response.unlockedReward.title}`
        : `Faltan ${remaining} para la recompensa`,
    });
    navigate("/result");
    } catch (error) {
      setResult({ kind: "warning", title: "Transacción no permitida", description: error instanceof Error ? error.message : "No pudimos registrar la transacción" });
      navigate("/result");
    }
  }
  async function cancel(customer: CashierCustomer) {
    try {
      await cashierService.cancelLastTransaction(customer.id);
      setResult({
        kind: "warning",
        title: "Transacción anulada",
        description: "La última transacción cambió a estado cancelled.",
        detail: "El evento quedó preparado para auditoría.",
      });
    } catch (e) {
      setResult({
        kind: "warning",
        title: "No fue posible anular",
        description:
          e instanceof Error
            ? e.message
            : "La transacción no cumple las condiciones.",
      });
    }
    navigate("/result");
  }
  function redeemed(customer: CashierCustomer, reward: CashierReward) {
    setResult({
      kind: "success",
      title: "Recompensa utilizada correctamente",
      description: reward.title,
      detail: `Cliente: ${customer.name}`,
    });
    navigate("/result");
  }
  if (!ready)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 font-bold text-white">
        Preparando caja…
      </main>
    );
  if (user?.forcePasswordChange) return <ForcePasswordChange onComplete={out} />;
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/" replace /> : <LoginPage onLogin={setUser} />
        }
      />
      <Route element={<Protected user={user} />}>
        <Route path="/" element={<HomePage user={user!} onLogout={out} />} />
        <Route
          path="/scan"
          element={<ScanPage onRegister={register} onCancel={cancel} />}
        />
        <Route
          path="/search"
          element={<SearchPage onRegister={register} onCancel={cancel} />}
        />
        <Route path="/redeem" element={<RedeemPage onRedeemed={redeemed} />} />
        <Route
          path="/result"
          element={
            result ? (
              <ActionResultMessage result={result} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
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
