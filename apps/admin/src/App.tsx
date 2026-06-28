import { useEffect,useState } from 'react';
import { AuthUser,logout,portalByRole,restoreSession } from '@miclub/shared';
import { HashRouter,Navigate,Outlet,Route,Routes,useNavigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { BusinessesPage } from './pages/BusinessesPage';import { DashboardPage } from './pages/DashboardPage';import { LoginPage } from './pages/LoginPage';import { PlansPage } from './pages/PlansPage';import { ReportsPage } from './pages/ReportsPage';import { SettingsPage } from './pages/SettingsPage';import { SupportPage } from './pages/SupportPage';import { UsersPage } from './pages/UsersPage';
import { adminService } from './services/admin.service';import { AdminDashboard,GlobalSettings,Reports,SupportTicket } from './types/admin';
function Protected({user}:{user:AuthUser|null}){if(!user)return <Navigate to="/login" replace/>;if(user.role!=='MICLUB_ADMIN')return <main className="grid min-h-screen place-items-center"><div><h1>Sin permiso</h1><a href={portalByRole[user.role]}>Ir al portal autorizado</a></div></main>;return <Outlet/>}
function AppRoutes(){
 const[user,setUser]=useState<AuthUser|null>(null);const[ready,setReady]=useState(false);const[dashboard,setDashboard]=useState<AdminDashboard|null>(null);const[reports,setReports]=useState<Reports|null>(null);const[settings,setSettings]=useState<GlobalSettings|null>(null);const[tickets,setTickets]=useState<SupportTicket[]>([]);const[error,setError]=useState('');const navigate=useNavigate();
 useEffect(()=>{restoreSession().then(async session=>{if(session.role!=='MICLUB_ADMIN'){await logout();setUser(null);return}setUser(session)}).catch(()=>setUser(null)).finally(()=>setReady(true))},[]);
 useEffect(()=>{if(user)Promise.all([adminService.getAdminDashboard(),adminService.getReports(),adminService.getGlobalSettings(),adminService.getSupportTickets()]).then(([d,r,s,t])=>{setDashboard(d);setReports(r);setSettings(s);setTickets(t)}).catch(e=>setError(e instanceof Error?e.message:'Error de conexión'))},[user]);
 async function out(){await logout();setUser(null);navigate('/login',{replace:true})}
 if(!ready)return <main className="grid min-h-screen place-items-center bg-slate-950 text-white">Preparando administración…</main>;
 if(!user)return <Routes><Route path="*" element={<LoginPage onLogin={setUser}/>}/></Routes>;
 if(!dashboard||!reports||!settings)return <main className="grid min-h-screen place-items-center">{error||'Cargando administración…'}</main>;
 return <Routes><Route element={<Protected user={user}/>}> <Route element={<AdminLayout onLogout={out}/>}> <Route path="/dashboard" element={<DashboardPage data={dashboard}/>}/><Route path="/businesses" element={<BusinessesPage/>}/><Route path="/users" element={<UsersPage/>}/><Route path="/plans" element={<PlansPage/>}/><Route path="/reports" element={<ReportsPage data={reports}/>}/><Route path="/support" element={<SupportPage items={tickets}/>}/><Route path="/settings" element={<SettingsPage settings={settings} onChange={setSettings}/>}/></Route></Route><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes>;
}
export function App(){return <HashRouter><AppRoutes/></HashRouter>}
