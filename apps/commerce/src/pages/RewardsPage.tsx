import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ProgramSummaryCard } from "../components/ProgramSummaryCard";
import { RewardsTable } from "../components/RewardsTable";
import { commerceService } from "../services/commerce.service";
import {
  BusinessReward,
  LoyaltyProgram,
  RewardStatus,
} from "../types/commerce";
const tabs: [RewardStatus, string][] = [
  ["available", "Disponibles"],
  ["redeemed", "Canjeadas"],
  ["expired", "Vencidas"],
  ["cancelled", "Canceladas"],
];
export function RewardsPage({ program }: { program: LoyaltyProgram | null }) {
  const [tab, setTab] = useState<RewardStatus>("available"),
    [items, setItems] = useState<BusinessReward[]>([]);
  useEffect(() => {
    commerceService.getRewards(tab).then(setItems);
  }, [tab]);
  return (
    <div className="page">
      <p className="eyebrow">Beneficios emitidos</p>
      <h1 className="title">Recompensas</h1>
      <p className="subtitle">
        Consulta el programa disponible y el estado de cada recompensa del
        comercio.
      </p>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-bold ${tab === id ? "bg-violet-700 text-white" : "bg-white text-slate-500"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "available" && program && (
        <section className="mt-3 max-w-2xl rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-emerald-700">
              <CheckCircle2 size={24} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Programa disponible
              </p>
              <h2 className="text-xl font-black">{program.reward}</h2>
            </div>
          </div>
          <ProgramSummaryCard program={program} />
        </section>
      )}
      <div className="mt-3">
        {items.length ? (
          <RewardsTable items={items} />
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-500">
            No hay recompensas emitidas en este estado.
          </p>
        )}
      </div>
    </div>
  );
}
