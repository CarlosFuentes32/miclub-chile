import { useEffect, useMemo, useState } from "react";
import { UserDetailPanel } from "../components/UserDetailPanel";
import { UsersTable } from "../components/UsersTable";
import { adminService } from "../services/admin.service";
import { AdminUser, UserRole, UserStatus } from "../types/admin";
export function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]),
    [selected, setSelected] = useState<AdminUser | null>(null),
    [query, setQuery] = useState(""),
    [role, setRole] = useState("");
  useEffect(() => {
    adminService.getUsers().then(setItems);
  }, []);
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
  async function update(status: UserStatus) {
    if (!selected) return;
    const u = await adminService.updateUserStatus(selected.id, status);
    setItems((v) => v.map((x) => (x.id === u.id ? u : x)));
    setSelected(u);
  }
  async function save(v: AdminUser) { await adminService.updateUser(v.id, { name:v.name,email:v.email,phone:v.phone,role:v.role }); const u=await adminService.getUserDetail(v.id); setItems(x=>x.map(i=>i.id===u.id?u:i)); setSelected(u); }
  async function password(value:string){if(selected)await adminService.changeUserPassword(selected.id,value)}
  async function remove(){if(!selected||!window.confirm('¿Desactivar esta cuenta? Se cerrarán sus sesiones activas.'))return;await adminService.deleteUser(selected.id);setItems(x=>x.filter(i=>i.id!==selected.id));setSelected(null)}
  return (
    <div className="page">
      <p className="eyebrow">Cuentas de plataforma</p>
      <h1 className="title">Usuarios</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_300px]">
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
        />
      )}
    </div>
  );
}
