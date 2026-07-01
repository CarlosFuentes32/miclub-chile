import { useEffect, useMemo, useState } from "react";
import { adminService } from "../services/admin.service";
import { SupportUser, UserChange } from "../types/admin";
const tabs = [
  ["clientes", "Clientes"],
  ["comercios", "Comercios"],
  ["cajeros", "Cajeros"],
  ["administradores", "Administradores"],
] as const;
export function SupportPage() {
  const [role, setRole] = useState("clientes"),
    [users, setUsers] = useState<SupportUser[]>([]),
    [selected, setSelected] = useState<SupportUser | null>(null),
    [history, setHistory] = useState<UserChange[]>([]),
    [query, setQuery] = useState(""),
    [temp, setTemp] = useState(""),
    [rut, setRut] = useState(""),
    [message, setMessage] = useState("");
  async function load() {
    try {
      const rows = await adminService.getSupportUsers(role);
      setUsers(rows);
      setSelected(null);
      setHistory([]);
      setTemp("");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No fue posible cargar usuarios",
      );
    }
  }
  useEffect(() => {
    load();
  }, [role]);
  const filtered = useMemo(
    () =>
      users.filter((u) =>
        `${u.name} ${u.email} ${u.phone} ${u.rut ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [users, query],
  );
  async function select(u: SupportUser) {
    setSelected(u);
    setRut(u.rut ?? "");
    setTemp("");
    setHistory(await adminService.getUserHistory(u.id));
  }
  async function save() {
    if (!selected) return;
    await adminService.updateUser(selected.id, {
      name: selected.name,
      email: selected.email,
      phone: selected.phone,
    });
    setMessage("Datos guardados.");
    await load();
  }
  async function reset() {
    if (
      !selected ||
      !confirm(
        "Se generará una contraseña temporal y se cerrarán sus sesiones. ¿Continuar?",
      )
    )
      return;
    const r = await adminService.resetSupportPassword(selected.id);
    setTemp(r.temporaryPassword);
    setMessage("Contraseña temporal generada. Se muestra una sola vez.");
  }
  async function unlock() {
    if (!selected) return;
    await adminService.unlockSupportUser(selected.id);
    setMessage("Cuenta desbloqueada.");
    await load();
  }
  async function correctRut() {
    if (
      !selected ||
      !confirm(
        "Esta acción modifica un dato tributario importante. ¿Confirma la corrección?",
      )
    )
      return;
    await adminService.correctSupportRut(selected.id, rut);
    setMessage("RUT corregido y auditado.");
    await load();
  }
  return (
    <div className="page">
      <p className="eyebrow">Administración segura</p>
      <h1 className="title">Soporte</h1>
      <p className="subtitle">
        Gestiona cuentas sin exponer contraseñas almacenadas.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setRole(k)}
            className={role === k ? "primary" : "secondary"}
          >
            {l}
          </button>
        ))}
      </div>
      <input
        className="input mt-5"
        placeholder="Buscar por nombre, correo, teléfono o RUT"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {message && (
        <p className="mt-4 rounded-2xl bg-violet-50 p-4 font-bold text-violet-800">
          {message}
        </p>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="panel space-y-2">
          {filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => select(u)}
              className="w-full rounded-2xl border border-slate-200 p-4 text-left"
            >
              <b>{u.name}</b>
              <span className="block text-sm text-slate-500">
                {u.email} · {u.role}
              </span>
            </button>
          ))}
        </section>
        {selected && (
          <section className="panel">
            <h2 className="text-xl font-black">Ficha de usuario</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="field">
                Nombre
                <input
                  className="input"
                  value={selected.name}
                  onChange={(e) =>
                    setSelected({ ...selected, name: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Correo
                <input
                  className="input"
                  type="email"
                  value={selected.email}
                  onChange={(e) =>
                    setSelected({ ...selected, email: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Teléfono
                <input
                  className="input"
                  value={selected.phone}
                  onChange={(e) =>
                    setSelected({ ...selected, phone: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Estado
                <input
                  className="input"
                  readOnly
                  value={selected.lockedAt ? "Bloqueado" : selected.status}
                />
              </label>
            </div>
            <button className="primary mt-4" onClick={save}>
              Guardar datos permitidos
            </button>
            <div className="mt-7 border-t pt-6">
              <h3 className="font-black">Acceso y seguridad</h3>
              <div className="mt-3 flex gap-3">
                <button className="secondary" onClick={reset}>
                  Restablecer contraseña
                </button>
                {selected.lockedAt && (
                  <button className="secondary" onClick={unlock}>
                    Desbloquear cuenta
                  </button>
                )}
              </div>
              {temp && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                  <p className="font-bold text-amber-800">
                    Copia ahora: no volverá a mostrarse.
                  </p>
                  <code className="mt-2 block text-lg font-black">{temp}</code>
                  <button
                    className="secondary mt-3"
                    onClick={() => navigator.clipboard.writeText(temp)}
                  >
                    Copiar contraseña
                  </button>
                </div>
              )}
            </div>
            <div className="mt-7 border-t pt-6">
              <h3 className="font-black">Corregir RUT</h3>
              <p className="text-sm text-amber-700">
                Esta acción modifica un dato tributario importante.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  className="input"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                />
                <button className="secondary" onClick={correctRut}>
                  Corregir RUT
                </button>
              </div>
            </div>
            <div className="mt-7 border-t pt-6">
              <h3 className="font-black">Historial</h3>
              {history.map((h) => (
                <div
                  key={h.id}
                  className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"
                >
                  <b>
                    {h.action}: {h.field}
                  </b>
                  <span className="block text-slate-500">
                    {new Date(h.createdAt).toLocaleString("es-CL")} ·{" "}
                    {h.actor?.name ?? "Sistema"}
                  </span>
                  {h.field !== "password" && (
                    <span>
                      {h.oldValue || "—"} → {h.newValue || "—"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
