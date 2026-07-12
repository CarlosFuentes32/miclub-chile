import assert from "node:assert/strict";

const DEFAULT_URLS = {
  landing: "https://miclubchile.cl",
  customer: "https://app.miclubchile.cl",
  commerce: "https://comercio.miclubchile.cl",
  cashier: "https://cajero.miclubchile.cl",
  admin: "https://admin.miclubchile.cl",
  apiHealth: "https://api.miclubchile.cl/health",
  apiDetailedHealth: "https://api.miclubchile.cl/api/health",
  protectedEndpoint: "https://api.miclubchile.cl/api/admin/dashboard",
};

async function checkOk(name: string, url: string) {
  const response = await fetch(url, { redirect: "follow" });
  assert(response.status >= 200 && response.status < 400, `${name} debe responder 2xx/3xx. status=${response.status}`);
  return { name, url, status: response.status };
}

async function checkProtected401(url: string) {
  const response = await fetch(url, { redirect: "manual" });
  assert([401, 403].includes(response.status), `ruta protegida debe rechazar sin token. status=${response.status}`);
  return { name: "protectedEndpoint", url, status: response.status };
}

async function run() {
  if (process.env.ALLOW_PRODUCTION_SMOKE !== "true") {
    throw new Error("Smoke productivo bloqueado. Define ALLOW_PRODUCTION_SMOKE=true solo para pruebas no destructivas autorizadas.");
  }
  const results = [];
  results.push(await checkOk("landing", process.env.PROD_LANDING_URL ?? DEFAULT_URLS.landing));
  results.push(await checkOk("customer", process.env.PROD_CUSTOMER_URL ?? DEFAULT_URLS.customer));
  results.push(await checkOk("commerce", process.env.PROD_COMMERCE_URL ?? DEFAULT_URLS.commerce));
  results.push(await checkOk("cashier", process.env.PROD_CASHIER_URL ?? DEFAULT_URLS.cashier));
  results.push(await checkOk("admin", process.env.PROD_ADMIN_URL ?? DEFAULT_URLS.admin));
  results.push(await checkOk("apiHealth", process.env.PROD_API_HEALTH_URL ?? DEFAULT_URLS.apiHealth));
  results.push(await checkOk("apiDetailedHealth", process.env.PROD_API_DETAILED_HEALTH_URL ?? DEFAULT_URLS.apiDetailedHealth));
  results.push(await checkProtected401(process.env.PROD_PROTECTED_ENDPOINT ?? DEFAULT_URLS.protectedEndpoint));
  console.log(JSON.stringify({ ok: true, destructive: false, results }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
