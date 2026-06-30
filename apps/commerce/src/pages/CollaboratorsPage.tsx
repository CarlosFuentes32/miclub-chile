import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { CollaboratorsTable } from "../components/CollaboratorsTable";
import { commerceService } from "../services/commerce.service";
import { Collaborator } from "../types/commerce";

export function CollaboratorsPage() {
  const [items, setItems] = useState<Collaborator[]>([]),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Collaborator | null>(null),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [role, setRole] = useState<Collaborator["role"]>("CASHIER"),
    [credentials, setCredentials] = useState<{
      email: string;
      password: string;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    commerceService.getCollaborators().then(setItems);
  }, []);
  function edit(c: Collaborator) {
    setEditing(c);
    setName(c.name);
    setEmail(c.email);
    setRole(c.role);
    setOpen(true);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        const updated = await commerceService.updateCollaborator({
          ...editing,
          name,
          email,
          role,
        });
        setItems((c) => c.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        if(password.length<4) throw new Error("La contraseña debe tener al menos 4 caracteres.");
        if(password!==confirmPassword) throw new Error("Las contraseñas no coinciden.");
        const created = await commerceService.createCollaborator({
          name,
          email,
          role,
          password,
        });
        setItems((c) => [created, ...c]);
        setCredentials({
          email: created.email,
          password: created.temporaryPassword,
        });
      }
      setOpen(false);
      setEditing(null);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible guardar el colaborador",
      );
    }
  }
  async function toggle(c: Collaborator) {
    const updated = await commerceService.updateCollaborator({
      ...c,
      status: c.status === "active" ? "inactive" : "active",
    });
    setItems((v) => v.map((x) => (x.id === updated.id ? updated : x)));
  }
  return (
    <div className="page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Equipo del comercio</p>
          <h1 className="title">Colaboradores</h1>
          <p className="subtitle">
            Crea cajeros y administradores con acceso independiente.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="primary shrink-0">
          <Plus size={18} /> Crear colaborador
        </button>
      </div>
      {credentials && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
          <strong>Cuenta creada correctamente</strong>
          <p className="mt-2">
            Correo: <code>{credentials.email}</code>
          </p>
          <p>
            Contraseña temporal: <code>{credentials.password}</code>
          </p>
          <p className="mt-2 text-sm">
            Guarda estos datos ahora para entregarlos al colaborador.
          </p>
          <button
            onClick={() => setCredentials(null)}
            className="secondary mt-3"
          >
            Entendido
          </button>
        </div>
      )}
      <div className="mt-7">
        <CollaboratorsTable items={items} onEdit={edit} onToggle={toggle} />
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-3 sm:place-items-center"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6"
          >
            <h2 className="text-2xl font-black">
              {editing ? "Editar colaborador" : "Nuevo colaborador"}
            </h2>
            <label className="field mt-5">
              Nombre
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="field mt-4">
              Correo
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            {!editing && (
              <><label className="field mt-4">Contraseña<span className="relative block"><input className="input pr-12" type={showPassword?"text":"password"} minLength={4} value={password} onChange={e=>setPassword(e.target.value)} required/><button type="button" aria-label="Mostrar contraseña" className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-700" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></span></label><label className="field mt-4">Confirmar contraseña<input className="input" type={showPassword?"text":"password"} minLength={4} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></label></>
            )}
            <label className="field mt-4">
              Rol
              <select
                className="input"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as Collaborator["role"])
                }
              >
                <option value="CASHIER">Cajero</option>
                <option value="BUSINESS_ADMIN">
                  Administrador de comercio
                </option>
              </select>
            </label>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700"
              >
                {error}
              </p>
            )}
            <button className="primary mt-5 w-full">Guardar colaborador</button>
          </form>
        </div>
      )}
    </div>
  );
}
