import { BusinessReward, RewardStatus } from "../types/commerce";
const labels: Record<RewardStatus, string> = {
  available: "Disponible",
  redeemed: "Canjeada",
  expired: "Vencida",
  cancelled: "Cancelada",
};
export function RewardsTable({ items }: { items: BusinessReward[] }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-400">
          <tr>
            {[
              "Cliente",
              "Recompensa",
              "Programa",
              "Generación",
              "Vencimiento",
              "Estado",
            ].map((h) => (
              <th key={h} className="px-5 py-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-5 py-4 font-bold">{r.customer}</td>
              <td className="px-5 py-4">{r.description}</td>
              <td className="px-5 py-4 font-semibold text-violet-700">{r.program}</td>
              <td className="px-5 py-4 text-slate-500">{r.generatedAt}</td>
              <td className="px-5 py-4 text-slate-500">{r.expiresAt}</td>
              <td className="px-5 py-4">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                  {labels[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
