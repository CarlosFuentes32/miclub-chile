import { Clock3, Gift, Home, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items=[{to:'/app',label:'Inicio',Icon:Home},{to:'/rewards',label:'Recompensas',Icon:Gift},{to:'/history',label:'Historial',Icon:Clock3},{to:'/profile',label:'Perfil',Icon:UserRound}];
export function BottomNav(){return <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-slate-100 bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"><div className="grid grid-cols-4">{items.map(({to,label,Icon})=><NavLink key={to} to={to} className={({isActive})=>`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold ${isActive?'bg-violet-50 text-violet-700':'text-slate-400'}`}><Icon size={21}/><span>{label}</span></NavLink>)}</div></nav>}
