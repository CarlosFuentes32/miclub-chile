import assert from "node:assert/strict";
import { EmailService } from "../backend/api/src/email/email.service";

class FakeConfig {
  constructor(private readonly values: Record<string, string | undefined>) {}
  get<T = string>(key: string, fallback?: T): T {
    return (this.values[key] ?? fallback) as T;
  }
}

async function run() {
  const calls: any[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: any) => {
    calls.push(JSON.parse(init.body));
    return { ok: true, status: 200, json: async () => ({ id: "email_mock_1" }) } as Response;
  }) as any;

  const service = new EmailService(new FakeConfig({
    RESEND_API_KEY: "mock_key_not_real",
    EMAIL_FROM: "MiClub Chile <no-reply@miclubchile.cl>",
    SUPPORT_EMAIL: "soporte@miclubchile.cl",
    APP_URL: "https://staging-app.miclubchile.cl",
    FRONTEND_URL: "https://staging.miclubchile.cl",
    NODE_ENV: "staging",
    STAGING_EMAIL_ALLOWLIST: "qa@miclubchile.cl,@miclubchile.cl",
  }) as any);

  const sent = await service.passwordReset("qa@miclubchile.cl", "QA Tester", "https://staging-app.miclubchile.cl/#/recover?token=secret-token", "reset-1");
  assert.equal(sent.sent, true, "correo enviado correctamente");
  assert.equal(calls.length, 1, "Resend recibió una llamada");
  assert.ok(calls[0].html.includes("QA Tester"), "incluye nombre destinatario");
  assert.ok(calls[0].html.includes("Crear nueva contraseña"), "incluye acción");
  assert.ok(!calls[0].html.includes("mock_key_not_real"), "no filtra API key");

  const duplicate = await service.passwordReset("qa@miclubchile.cl", "QA Tester", "https://staging-app.miclubchile.cl/#/recover?token=secret-token", "reset-1");
  assert.equal(duplicate.skipped, true, "evita correos duplicados");

  const blocked = await service.passwordReset("cliente@example.com", "Cliente", "https://staging-app.miclubchile.cl/#/recover?token=x", "reset-2");
  assert.equal(blocked.reason, "recipient_not_allowed_in_staging", "bloquea destinatarios fuera de QA en staging");

  const unconfigured = new EmailService(new FakeConfig({ NODE_ENV: "production" }) as any);
  const skipped = await unconfigured.passwordChanged("qa@miclubchile.cl", "QA Tester");
  assert.equal(skipped.reason, "email_not_configured", "maneja falta de configuración");

  globalThis.fetch = (async () => ({ ok: false, status: 503, json: async () => ({ message: "temporary unavailable" }) }) as Response) as any;
  const providerError = await service.rewardRedeemed("qa@miclubchile.cl", "QA Tester", "Comercio QA", "Café gratis");
  assert.equal(providerError.sent, false, "maneja error temporal del proveedor");
  assert.equal(providerError.status, 503, "conserva status seguro del proveedor");

  globalThis.fetch = originalFetch;
  console.log("OK: pruebas de email transaccional superadas");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
