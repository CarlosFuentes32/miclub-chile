import { useEffect, useState } from 'react';
import { AuthUser, logout, portalByRole, restoreSession } from '@miclub/shared';
import { HashRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { QRScreen } from './components/QRScreen';
import { CustomerLayout } from './layouts/CustomerLayout';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { RewardsPage } from './pages/RewardsPage';
import { SplashPage } from './pages/SplashPage';
import { WelcomePage } from './pages/WelcomePage';
import { customerService } from './services/customer.service';
import { CustomerDashboard } from './types/customer';

function Protected({ user }: { user: AuthUser | null }) {
  if (!user) return <Navigate to="/welcome" replace />;
  if (user.role !== 'CUSTOMER') return <main className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-3xl font-black">Sin permiso</h1><p className="mt-2 text-slate-500">Tu cuenta no puede acceder al Panel Cliente.</p><a href={portalByRole[user.role]} className="mt-5 inline-block font-bold text-violet-700">Ir a tu portal</a></div></main>;
  return <Outlet />;
}

function AppRoutes() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [dashboard,setDashboard]=useState<CustomerDashboard|null>(null);
  const [dataError,setDataError]=useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const minimumSplash = new Promise(resolve => window.setTimeout(resolve, 650));
    Promise.allSettled([restoreSession(), minimumSplash]).then(([session]) => {
      if (session.status === 'fulfilled') {
        if (session.value.role === 'CUSTOMER') setUser(session.value);
        else {
          window.location.replace(portalByRole[session.value.role]);
          return;
        }
      }
      setBooting(false);
    });
  }, []);
  useEffect(()=>{if(user)customerService.getDashboard().then(setDashboard).catch(e=>setDataError(e instanceof Error?e.message:'Error de conexión'));else setDashboard(null)},[user]);

  async function signOut() { await logout(); setUser(null); navigate('/welcome', { replace: true }); }
  if (booting) return <SplashPage />;

  return <Routes>
    <Route path="/" element={<Navigate to={user ? '/app' : '/welcome'} replace />} />
    <Route path="/welcome" element={user ? <Navigate to="/app" replace /> : <WelcomePage />} />
    <Route path="/login" element={user ? <Navigate to="/app" replace /> : <LoginPage onLogin={setUser} />} />
    <Route path="/register" element={user ? <Navigate to="/app" replace /> : <RegisterPage />} />
    <Route element={<Protected user={user} />}>
      <Route path="/qr" element={dashboard?<QRScreen profile={{...customerService.getProfile(user!),shortCode:dashboard.shortCode}} token={dashboard.qrToken}/>:<main className="grid min-h-screen place-items-center">Cargando QR…</main>} />
      <Route element={<CustomerLayout />}>
        <Route path="/app" element={dashboard?<HomePage user={user!} dashboard={dashboard}/>:<main className="p-6 text-center">{dataError||'Cargando beneficios…'}</main>} />
        <Route path="/rewards" element={<RewardsPage rewards={dashboard?.rewards??[]} />} />
        <Route path="/history" element={<HistoryPage history={dashboard?.history??[]} />} />
        <Route path="/profile" element={<ProfilePage user={user!} onLogout={signOut} />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export function App() { return <HashRouter><AppRoutes /></HashRouter>; }
