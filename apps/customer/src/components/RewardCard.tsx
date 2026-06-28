import { Gift } from 'lucide-react';
import { Reward } from '../types/customer';

export function RewardCard({ reward }: { reward: Reward }) {
  const meta = reward.status==='used'?`Utilizada ${reward.usedAt}`:reward.status==='expired'?`Venció ${reward.expiresAt}`:`Vence ${reward.expiresAt}`;
  return <article className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${reward.status==='available'?'bg-violet-100 text-violet-700':'bg-slate-100 text-slate-400'}`}><Gift size={22}/></span><div className="min-w-0 flex-1"><h3 className="truncate font-bold text-slate-900">{reward.title}</h3><p className="text-sm text-slate-500">{reward.business}</p><p className="mt-1 text-xs font-medium text-slate-400">{meta}</p></div>{reward.status==='available'&&<span className="h-2.5 w-2.5 rounded-full bg-emerald-500"/>}</article>;
}
