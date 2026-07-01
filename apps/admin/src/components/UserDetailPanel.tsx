import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import {
  formatearTelefonoChile,
  telefonoLocal,
  validarEmail,
  validarPassword,
} from "@miclub/shared";
import { AdminUser, UserRole, UserStatus } from "../types/admin";
import { StatusBadge } from "./StatusBadge";
export function UserDetailPanel({
  user,
  onClose,
  onStatus,
  onSave,
  onPassword,
  onDelete,
  onReactivate,
}: {
  user: AdminUser;
  onClose: () => void;
  onStatus: (s: UserStatus) => void;
  onSave: (v: AdminUser) => Promise<void>;
  onPassword: (p: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onReactivate: () => Promise<void>;
}) {
  const [value, setValue] = useState(user),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [generated, setGenerated] = useState(""),
    [show, setShow] = useState(false),
    [message, setMessage] = useState("");
  async function save() {
    if (!validarEmail(value.email))
      return setMessage("Ingresa un correo válido.");
    await onSave(value);
    setMessage("Datos guardados.");
  }
  async function changePassword() {
    if (!validarPassword(password))
      return setMessage("La contraseña debe tener al menos 4 caracteres.");
    if (password !== confirmPassword)
      return setMessage("Las contraseñas no coinciden.");
    await onPassword(password);
    setPassword("");
    setConfirmPassword("");
    setMessage(
      "Contraseña actualizada; las sesiones anteriores fueron cerradas.",
    );
  }
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 pb-12"
      >
        <button
          onClick={onClose}
          className="float-right grid h-10 w-10 place-items-center rounded-full bg-slate-100"
        >
          <X />
        </button>
        <p className="eyebrow">Detalle de usuario</p>
        <h2 className="mt-2 text-3xl font-black">{user.name}</h2>
        <div className="mt-3">
          <StatusBadge status={user.status} />
        </div>
        {user.status === "deleted" && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm">
            <b>Cuenta eliminada</b>
            <p>Fecha: {user.deletedAt ?? "No registrada"}</p>
            <p>
              Eliminada por:{" "}
              {user.deletedBy?.name ?? "Flujo anterior / no disponible"}
            </p>
          </div>
        )}
        <div className="mt-7 space-y-4">
          <label className="field">
            Nombre
            <input
              className="input"
              value={value.name}
              onChange={(e) =>
                setValue((v) => ({ ...v, name: e.target.value }))
              }
            />
          </label>
          <label className="field">
            Correo
            <input
              className="input"
              type="email"
              value={value.email}
              onChange={(e) =>
                setValue((v) => ({ ...v, email: e.target.value }))
              }
            />
          </label>
          <label className="field">
            Teléfono
            <span className="phone-field">
              <b>+569</b>
              <input
                className="input"
                inputMode="numeric"
                maxLength={8}
                value={telefonoLocal(value.phone)}
                onChange={(e) =>
                  setValue((v) => ({
                    ...v,
                    phone: formatearTelefonoChile(e.target.value),
                  }))
                }
              />
            </span>
          </label>
          <label className="field">
            Rol
            <select
              className="input"
              value={value.role}
              onChange={(e) =>
                setValue((v) => ({ ...v, role: e.target.value as UserRole }))
              }
            >
              {[
                "CUSTOMER",
                "CASHIER",
                "BUSINESS_ADMIN",
                "BUSINESS_OWNER",
                "MICLUB_ADMIN",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button className="primary w-full" onClick={save}>
            Guardar datos
          </button>
          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-black">Cambiar contraseña</h3>
            <span className="relative mt-3 block">
              <input
                className="input pr-12"
                type={show ? "text" : "password"}
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nueva contraseña"
              />
              <button
                type="button"
                className="eye"
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </span>
            <input
              className="input"
              type={show ? "text" : "password"}
              minLength={4}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar contraseña"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const next = `MiClub-${crypto.randomUUID().slice(0, 8)}`;
                  setPassword(next);
                  setConfirmPassword(next);
                  setGenerated(next);
                  setShow(true);
                }}
              >
                Generar contraseña temporal
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!generated}
                onClick={() => navigator.clipboard.writeText(generated)}
              >
                Copiar contraseña
              </button>
            </div>
            {generated && (
              <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-sm">
                <strong>Temporal:</strong> <code>{generated}</code>
              </p>
            )}
            <button className="secondary mt-3 w-full" onClick={changePassword}>
              Establecer nueva contraseña
            </button>
          </div>
          {message && (
            <p className="rounded-xl bg-violet-50 p-3 text-sm font-bold text-violet-800">
              {message}
            </p>
          )}
          {user.status !== "deleted" && (
            <button
              onClick={() =>
                onStatus(user.status === "active" ? "suspended" : "active")
              }
              className={`w-full ${user.status === "active" ? "danger" : "primary"}`}
            >
              {user.status === "active"
                ? "Suspender usuario"
                : "Activar usuario"}
            </button>
          )}
          {user.status === "deleted" ? (
            <button onClick={onReactivate} className="primary w-full">
              Reactivar usuario
            </button>
          ) : (
            <button onClick={onDelete} className="danger w-full">
              Eliminar usuario
            </button>
          )}
          {user.status !== "deleted" && (
            <p className="text-xs text-slate-500">
              Esta acción no borra el historial. La cuenta quedará desactivada y
              podrá reactivarse desde Usuarios Eliminados.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
