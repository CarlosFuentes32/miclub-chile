import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';

export function CustomerLayout(){return <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24 shadow-xl shadow-slate-200/40"><Outlet/><BottomNav/></div>}
