import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';

export function CustomerLayout(){return <div className="mx-auto min-h-screen max-w-md bg-gradient-to-b from-white via-slate-50 to-violet-50/50 pb-24 shadow-2xl shadow-violet-200/30"><Outlet/><BottomNav/></div>}
