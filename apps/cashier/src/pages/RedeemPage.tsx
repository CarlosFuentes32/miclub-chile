import { ArrowLeft, Camera, Phone, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneSearchInput } from "../components/PhoneSearchInput";
import { RewardAvailableCard } from "../components/RewardAvailableCard";
import { ScanQrView } from "../components/ScanQrView";
import { cashierService } from "../services/cashier.service";
import { CashierCustomer, CashierReward } from "../types/cashier";

export function RedeemPage({
  onRedeemed,
}: {
  onRedeemed: (customer: CashierCustomer, reward: CashierReward) => void;
}) {
  const [method, setMethod] = useState<"scan" | "phone">("scan"),
    [digits, setDigits] = useState(""),
    [customer, setCustomer] = useState<CashierCustomer | null>(null),
    [busy, setBusy] = useState(false),
    [notFound, setNotFound] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();

  function switchMethod(next: "scan" | "phone") {
    setMethod(next);
    setError("");
    setNotFound(false);
    setCustomer(null);
  }

  const detect = useCallback(async (payload: string) => {
    setBusy(true);
    setError("");
    setNotFound(false);
    try {
      setCustomer(await cashierService.scanCustomer(payload));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cliente no encontrado");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    setCustomer(null);
    setNotFound(false);
    setError("");
    if (method !== "phone" || digits.length !== 8) {
      setBusy(false);
      return;
    }
    let active = true;
    setBusy(true);
    const timer = window.setTimeout(() => {
      cashierService
        .searchCustomerByPhone(`+569${digits}`)
        .then((result) => {
          if (!active) return;
          setCustomer(result);
          setNotFound(!result);
        })
        .catch(() => {
          if (!active) return;
          setCustomer(null);
          setNotFound(false);
          setError("No pudimos buscar ese teléfono. Intenta nuevamente.");
        })
        .finally(() => active && setBusy(false));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [digits, method]);

  async function redeem(reward: CashierReward) {
    if (!customer) return;
    setBusy(true);
    setError("");
    try {
      const used = await cashierService.redeemReward(customer.id, reward.id);
      onRedeemed(customer, used);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos canjear la recompensa",
      );
    } finally {
      setBusy(false);
    }
  }

  const available =
    customer?.rewards.filter((r) => r.status === "available") ?? [];
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <button
        onClick={() => navigate("/")}
        className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm"
        aria-label="Volver"
      >
        <ArrowLeft />
      </button>
      <h1 className="mt-5 text-3xl font-black">Canjear recompensa</h1>
      <p className="mt-1 text-slate-500">
        Identifica al cliente y canjea en un toque.
      </p>
      {!customer && (
        <>
          <div className="mt-5 grid grid-cols-2 rounded-2xl bg-slate-200 p-1">
            <button
              type="button"
              onClick={() => switchMethod("scan")}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${method === "scan" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              <Camera size={18} /> Escanear
            </button>
            <button
              type="button"
              onClick={() => switchMethod("phone")}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${method === "phone" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              <Phone size={18} /> Teléfono
            </button>
          </div>
          <div className="mt-5">
            {method === "scan" ? (
              <ScanQrView onDetected={detect} />
            ) : (
              <PhoneSearchInput
                digits={digits}
                onChange={setDigits}
                searching={busy}
              />
            )}
          </div>
        </>
      )}
      {customer && (
        <section className="mt-6">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black">{customer.name}</h2>
            <p className="text-sm text-slate-500">
              {customer.business} · {customer.phone}
            </p>
          </div>
          <h3 className="mb-3 mt-6 text-lg font-black">
            Recompensas disponibles
          </h3>
          <div className="space-y-3">
            {available.length ? (
              available.map((reward) => (
                <RewardAvailableCard
                  key={reward.id}
                  reward={reward}
                  onRedeem={redeem}
                  busy={busy}
                />
              ))
            ) : (
              <p className="rounded-2xl bg-white p-6 text-center text-slate-500">
                Este cliente no tiene recompensas disponibles.
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setCustomer(null);
              setDigits("");
              setNotFound(false);
              setError("");
            }}
            className="mt-4 w-full py-3 text-sm font-bold text-slate-500"
          >
            Buscar otro cliente
          </button>
        </section>
      )}
      {notFound && (
        <div className="mt-5 rounded-3xl bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-700">
            <UserPlus />
          </span>
          <h2 className="mt-4 text-xl font-black">
            No encontramos ese número.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Revisa los dígitos finales del teléfono o busca otro cliente.
          </p>
        </div>
      )}
      {busy && method === "scan" && (
        <p className="mt-4 text-center font-bold text-violet-700">Buscando…</p>
      )}
      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </main>
  );
}
