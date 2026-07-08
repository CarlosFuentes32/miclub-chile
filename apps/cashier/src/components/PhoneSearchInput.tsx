import { Search } from "lucide-react";

export function PhoneSearchInput({
  digits,
  onChange,
  searching = false,
}: {
  digits: string;
  onChange: (digits: string) => void;
  searching?: boolean;
}) {
  function update(value: string) {
    onChange(value.replace(/\D/g, "").replace(/^569/, "").slice(0, 8));
  }

  return (
    <div>
      <label
        className="text-sm font-bold text-slate-700"
        htmlFor="phone-search"
      >
        Número de teléfono
      </label>
      <div className="mt-2 flex min-h-16 items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-violet-600 focus-within:ring-4 focus-within:ring-violet-100">
        <Search className="shrink-0 text-slate-400" />
        <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
          +569
        </span>
        <input
          id="phone-search"
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="tel"
          value={digits}
          onChange={(e) => update(e.target.value)}
          placeholder="95026368"
          className="min-w-0 flex-1 bg-transparent py-4 text-lg font-black tracking-wide text-slate-950 outline-none sm:text-xl"
          aria-describedby="phone-help"
        />
        {searching && (
          <span
            className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-violet-600 border-t-transparent"
            aria-label="Buscando"
          />
        )}
      </div>
      <p
        id="phone-help"
        className="mt-2 text-sm leading-relaxed text-slate-500"
      >
        Escribe o pega el número del cliente. Usaremos automáticamente sus 8
        dígitos finales.
      </p>
      {digits && (
        <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-center text-lg font-black text-slate-950 shadow-sm">
          +569{digits}
        </p>
      )}
    </div>
  );
}
