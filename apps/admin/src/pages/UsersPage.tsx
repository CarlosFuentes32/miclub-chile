import { useEffect, useMemo, useState } from "react";
import { UserDetailPanel } from "../components/UserDetailPanel";
import { UsersTable } from "../components/UsersTable";
import { adminService } from "../services/admin.service";
import { AdminUser, UserRole, UserStatus } from "../types/admin";
export function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]),
    [selected, setSelected] = useState<AdminUser | null>(null),
    [query, setQuery] = useState(""),
    [role, setRole] = useState(""),
    [status, setStatus] = useState("all");
  useEffect(() => {
    adminService.getUsers(status).then(setItems);
    setSelected(null);
  }, [status]);
  const visible = useMemo(
    () =>
      items.filter(
        (u) =>
          `${u.name} ${u.phone} ${u.email}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (!role || u.role === role),
      ),
    [items, query, role],
  );
  async function refresh(id: string) {
    const u = await adminService.getUserDetail(id);
    setItems((v) => v.map((x) => (x.id === u.id ? u : x)));
    setSelected(u);
  }
  async function update(s: UserStatus) {
    if (!selected) return;
    await adminService.updateUserStatus(selected.id, s);
    await refresh(selected.id);
  }
  async function save(v: AdminUser) {
    await adminService.updateUser(v.id, {
      name: v.name,
      email: v.email,
      phone: v.phone,
      role: v.role,
    });
    await refresh(v.id);
  }
  async function password(value: string) {
    if (selected) await adminService.changeUserPassword(selected.id, value);
  }
  async function remove() {
    if (
      !selected ||
      !window.confirm(
        "Esta acción no borra el historial. La cuenta quedará desactivada y podrá reactivarse desde Usuarios Eliminados. ¿Continuar?",
      )
    )
      return;
    await adminService.deleteUser(selected.id);
    await refresh(selected.id);
  }
  async function reactivate() {
    if (!selected) return;
    await adminService.reactivateUser(selected.id);
    await refresh(selected.id);
  }
  return (
    <div className="page">
      <p className="eyebrow">Cuentas de plataforma</p>
      <h1 className="title">Usuarios</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_240px_220px]">
        <input
          className="input mt-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nombre, teléfono o correo"
        />
        <select
          className="input mt-0"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Todos los roles</option>
          {(
            [
              "CUSTOMER",
              "CASHIER",
              "BUSINESS_ADMIN",
              "BUSINESS_OWNER",
              "MICLUB_ADMIN",
            ] as UserRole[]
          ).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          className="input mt-0"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
          <option value="deleted">Eliminados</option>
        </select>
      </div>
      <div className="mt-4">
        <UsersTable items={visible} onSelect={setSelected} />
      </div>
      {selected && (
        <UserDetailPanel
          user={selected}
          onClose={() => setSelected(null)}
          onStatus={update}
          onSave={save}
          onPassword={password}
          onDelete={remove}
          onReactivate={reactivate}
        />
      )}
    </div>
  );
}
