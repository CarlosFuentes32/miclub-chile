export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="inline-flex items-center gap-3"><span className={`${compact?'h-9 w-9 text-sm':'h-14 w-14 text-xl'} grid place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 font-black text-white shadow-lg shadow-violet-200`}>M</span><span className={`${compact?'text-lg':'text-2xl'} font-black tracking-tight text-slate-950`}>MiClub <span className="text-violet-600">Chile</span></span></div>;
}
