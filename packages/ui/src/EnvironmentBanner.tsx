const env = (import.meta as any).env?.VITE_APP_ENV ?? "";
const label = (import.meta as any).env?.VITE_ENVIRONMENT_LABEL ?? "AMBIENTE DE PRUEBAS";

export function EnvironmentBanner() {
  if (env !== "staging") return null;
  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: "linear-gradient(90deg,#f59e0b,#7c3aed,#06b6d4)",
        color: "white",
        textAlign: "center",
        fontWeight: 900,
        letterSpacing: ".16em",
        fontSize: "12px",
        padding: "10px 12px",
        textTransform: "uppercase",
        boxShadow: "0 8px 24px rgba(15,23,42,.18)",
      }}
    >
      {label}
    </div>
  );
}
