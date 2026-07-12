export interface E2EConfig {
  env: string;
  apiUrl: string;
  adminUrl: string;
  commerceUrl: string;
  cashierUrl: string;
  customerUrl: string;
  adminEmail: string;
  adminPassword: string;
  defaultPassword: string;
  billingWebhookSecret?: string;
  vercelBypassSecret?: string;
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable requerida para E2E staging: ${name}`);
  return value.replace(/\/$/, "");
}

export function getE2EConfig(): E2EConfig {
  return {
    env: process.env.E2E_ENV ?? "",
    apiUrl: required("E2E_API_URL"),
    adminUrl: required("E2E_ADMIN_URL"),
    commerceUrl: required("E2E_COMMERCE_URL"),
    cashierUrl: required("E2E_CASHIER_URL"),
    customerUrl: required("E2E_CUSTOMER_URL"),
    adminEmail: required("E2E_ADMIN_EMAIL"),
    adminPassword: required("E2E_ADMIN_PASSWORD"),
    defaultPassword: required("E2E_DEFAULT_PASSWORD"),
    billingWebhookSecret: process.env.E2E_BILLING_WEBHOOK_SECRET,
    vercelBypassSecret: process.env.E2E_VERCEL_BYPASS_SECRET,
  };
}

export function assertStagingEnvironment(config: E2EConfig) {
  if (config.env !== "staging") {
    throw new Error("E2E bloqueado: define E2E_ENV=staging. La suite nunca debe ejecutarse contra producción.");
  }
  const urls = [config.apiUrl, config.adminUrl, config.commerceUrl, config.cashierUrl, config.customerUrl];
  for (const raw of urls) {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const isProduction =
      host === "miclubchile.cl" ||
      host === "www.miclubchile.cl" ||
      host === "api.miclubchile.cl" ||
      host === "admin.miclubchile.cl" ||
      host === "comercio.miclubchile.cl" ||
      host === "cajero.miclubchile.cl" ||
      host === "app.miclubchile.cl";
    const isMiClubPreview = host.endsWith(".vercel.app") && host.includes("mi-club-chile");
    if (isProduction || (!host.includes("staging") && !isMiClubPreview)) {
      throw new Error(`E2E bloqueado: ${raw} no parece staging. Usa dominios staging o previews aislados.`);
    }
  }
}

export const e2e = getE2EConfig();
