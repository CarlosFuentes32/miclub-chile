import { EmailService } from "../backend/api/src/email/email.service";

class EnvConfig {
  get<T = string>(key: string, fallback?: T): T {
    return (process.env[key] ?? fallback) as T;
  }
}

async function main() {
  const to = process.env.QA_EMAIL_TO;
  const required = ["RESEND_API_KEY", "EMAIL_FROM", "SUPPORT_EMAIL", "APP_URL", "NODE_ENV"];
  const missing = required.filter((key) => !process.env[key]);
  if (!to) missing.push("QA_EMAIL_TO");
  if (missing.length) {
    console.error(`Faltan variables: ${missing.join(", ")}`);
    process.exit(2);
  }
  if (process.env.NODE_ENV !== "staging" && process.env.ALLOW_PRODUCTION_EMAIL_TEST !== "true") {
    console.error("Este script está bloqueado fuera de staging. Define ALLOW_PRODUCTION_EMAIL_TEST=true solo para una prueba controlada.");
    process.exit(2);
  }
  const service = new EmailService(new EnvConfig() as any);
  const result = await service.passwordReset(to!, "QA MiClub", `${process.env.APP_URL}/#/recover?token=REDACTED_QA_TEST`, `qa-send:${Date.now()}`);
  if (!result.sent) {
    console.error(`No enviado: ${result.reason ?? result.status ?? "unknown"}`);
    process.exit(1);
  }
  console.log(`OK: correo QA enviado. providerId=${result.providerId ?? "sin-id"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
