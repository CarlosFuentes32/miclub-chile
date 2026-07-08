import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";

export function SuperSettingsPage() {
  const [settings, setSettings] = useState<any | null>(null),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    adminService.getSuperGlobalSettings().then(setSettings);
  }, []);
  if (!settings) return <main className="page">Cargando configuración…</main>;
  function set(key: string, value: unknown) {
    setSettings((s: any) => ({ ...s, [key]: value }));
    setSaved(false);
  }
  async function save() {
    setSettings(await adminService.updateSuperGlobalSettings(settings));
    setSaved(true);
  }
  return (
    <main className="page">
      <p className="eyebrow">Configuración Global</p>
      <h1 className="title">Parámetros de MiClub Chile</h1>
      <section className="mt-7 grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 lg:grid-cols-2">
        <label className="field">
          Nombre comercial
          <input
            className="input"
            value={settings.platformName ?? ""}
            onChange={(e) => set("platformName", e.target.value)}
          />
        </label>
        <label className="field">
          Color principal
          <input
            className="input"
            value={settings.primaryColor ?? ""}
            onChange={(e) => set("primaryColor", e.target.value)}
          />
        </label>
        <label className="field lg:col-span-2">
          Mensaje de bienvenida
          <textarea
            className="input"
            value={settings.welcomeMessage ?? ""}
            onChange={(e) => set("welcomeMessage", e.target.value)}
          />
        </label>
        <label className="field">
          Expiración de recompensas (días)
          <input
            className="input"
            type="number"
            value={settings.rewardExpirationDays ?? 30}
            onChange={(e) =>
              set("rewardExpirationDays", Number(e.target.value))
            }
          />
        </label>
        <label className="field lg:col-span-2">
          Políticas generales
          <textarea
            className="input min-h-32"
            value={settings.policies ?? ""}
            onChange={(e) => set("policies", e.target.value)}
          />
        </label>
        <div className="lg:col-span-2 flex flex-wrap gap-3">
          {Object.entries(settings.modules ?? {}).map(([key, value]) => (
            <label
              key={key}
              className="rounded-2xl bg-slate-50 px-4 py-3 font-bold"
            >
              <input
                className="mr-2"
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) =>
                  set("modules", {
                    ...(settings.modules ?? {}),
                    [key]: e.target.checked,
                  })
                }
              />
              {key}
            </label>
          ))}
        </div>
        <button className="primary lg:col-span-2" onClick={save}>
          {saved ? "Configuración guardada ✓" : "Guardar con auditoría"}
        </button>
      </section>
    </main>
  );
}
