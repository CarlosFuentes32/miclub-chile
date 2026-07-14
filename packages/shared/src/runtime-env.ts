const STAGING_API_URL = "https://miclub-chile-staging.up.railway.app/api";

export function isMiClubVercelPreview() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith(".vercel.app") && host.includes("mi-club-chile");
}

export function getApiUrl() {
  if (isMiClubVercelPreview()) return STAGING_API_URL;

  return (
    import.meta.env.VITE_API_URL ??
    (import.meta.env.PROD
      ? "https://api.miclubchile.cl/api"
      : "http://localhost:3000/api")
  );
}
