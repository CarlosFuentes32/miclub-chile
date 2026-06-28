import { LoyaltyProgress } from '../types/customer';

export function ProgressCard({ progress }: { progress: LoyaltyProgress }) {
  const remaining = Math.max(progress.goal - progress.current, 0);
  return <section className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-200">
    <div className="flex items-start justify-between"><div><p className="text-sm text-slate-300">Tu programa principal</p><h2 className="mt-1 text-xl font-bold">{progress.business}</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{progress.current}/{progress.goal}</span></div>
    <div className="mt-5 flex gap-1.5" aria-label={`${progress.current} de ${progress.goal} compras`}>{Array.from({length:progress.goal},(_,i)=><span key={i} className={`h-3 flex-1 rounded-full ${i<progress.current?'bg-violet-400':'bg-white/15'}`}/>)}</div>
    <p className="mt-4 font-semibold">{progress.current} de {progress.goal} compras</p><p className="mt-1 text-sm text-slate-300">Te faltan {remaining} compras para tu recompensa</p>
    <div className="mt-5 rounded-2xl bg-white/10 p-4"><p className="text-xs uppercase tracking-wider text-violet-300">Próxima recompensa</p><p className="mt-1 font-bold">{progress.reward}</p></div>
  </section>;
}
