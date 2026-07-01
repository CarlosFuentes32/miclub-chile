import { AuthUser } from "@miclub/shared";
import { CashierHomeActions } from "../components/CashierHomeActions";
import { useEffect, useState } from "react";
import { cashierService } from "../services/cashier.service";

export function HomePage({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [business, setBusiness] = useState("Cargando comercio…");

  useEffect(() => {
    cashierService.getBusinessName().then(setBusiness).catch(() => setBusiness("Comercio no asignado"));
  }, []);

  return <main className="cashier-shell pt-[max(1.5rem,env(safe-area-inset-top))]">
    <header className="mb-7">
      <img src="/logo-miclub-chile-transparent.png" alt="MiClub Chile" className="mb-5 h-24 w-auto object-contain" />
      <p className="text-sm font-black uppercase tracking-[.14em] text-violet-700">{business} · Caja</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Hola, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 text-slate-500">¿Qué necesitas hacer?</p>
    </header>
    <CashierHomeActions onLogout={onLogout} />
  </main>;
}
