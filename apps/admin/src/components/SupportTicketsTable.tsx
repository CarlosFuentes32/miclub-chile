import { SupportTicket } from "../types/admin";
import { StatusBadge } from "./StatusBadge";

export function SupportTicketsTable({ items }: { items: SupportTicket[] }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
      <table className="w-full min-w-[740px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-400">
          <tr>{["Ticket", "Categoría", "Estado", "Prioridad", "Request ID", "Creación"].map((x) => <th key={x} className="px-5 py-4">{x}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-t border-slate-100">
              <td className="px-5 py-4 font-bold">{t.title}</td>
              <td className="px-5 py-4">{t.category}</td>
              <td className="px-5 py-4"><StatusBadge status={t.status.toLowerCase()} /></td>
              <td className="px-5 py-4 capitalize">{t.priority.toLowerCase()}</td>
              <td className="px-5 py-4">{t.requestId ?? "—"}</td>
              <td className="px-5 py-4">{new Date(t.createdAt).toLocaleString("es-CL")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
