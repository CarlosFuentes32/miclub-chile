import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailPayload, EmailResult } from "./email.types";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly dedupe = new Map<string, number>();

  constructor(private readonly config: ConfigService) {}

  async send(payload: EmailPayload): Promise<EmailResult> {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("EMAIL_FROM");
    if (!apiKey || !from) return { sent: false, skipped: true, reason: "email_not_configured" };
    if (!this.allowedRecipient(payload.to)) return { sent: false, skipped: true, reason: "recipient_not_allowed_in_staging" };
    if (payload.dedupeKey && this.isDuplicate(payload.dedupeKey)) return { sent: false, skipped: true, reason: "duplicate_suppressed" };

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: payload.to,
          subject: payload.subject,
          html: this.render(payload),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.logger.warn(`Resend rejected ${payload.template} email. status=${response.status} toDomain=${this.domain(payload.to)}`);
        return { sent: false, status: response.status, reason: body?.message ?? "provider_error" };
      }
      return { sent: true, providerId: body?.id };
    } catch (error) {
      this.logger.warn(`Resend temporary failure for ${payload.template}. toDomain=${this.domain(payload.to)}`);
      return { sent: false, reason: error instanceof Error ? error.name : "provider_unavailable" };
    }
  }

  passwordReset(to: string, name: string, resetUrl: string, dedupeKey: string) {
    return this.send({
      to,
      name,
      template: "password_reset",
      subject: "Recupera tu contraseña de MiClub Chile",
      title: "Crea una nueva contraseña",
      intro: "Recibimos una solicitud para recuperar tu acceso a MiClub Chile.",
      actionLabel: "Crear nueva contraseña",
      actionUrl: resetUrl,
      securityNote: "Este enlace es de un solo uso y vence en 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo.",
      dedupeKey,
    });
  }

  accountCreated(to: string, name: string, role: string) {
    return this.send({
      to,
      name,
      template: "account_created",
      subject: "Tu cuenta MiClub Chile está activa",
      title: "Bienvenido a MiClub Chile",
      intro: "Tu cuenta fue creada correctamente y ya puedes ingresar al panel correspondiente.",
      details: [{ label: "Rol", value: role }],
      actionLabel: "Ingresar a MiClub",
      actionUrl: this.appUrl(),
      securityNote: "Nunca compartas tu contraseña. MiClub Chile no te pedirá claves por correo ni WhatsApp.",
      dedupeKey: `account_created:${to}`,
    });
  }

  passwordChanged(to: string, name: string) {
    return this.send({
      to,
      name,
      template: "password_changed",
      subject: "Tu contraseña fue actualizada",
      title: "Contraseña actualizada",
      intro: "Te confirmamos que la contraseña de tu cuenta MiClub Chile fue cambiada correctamente.",
      actionLabel: "Ingresar a MiClub",
      actionUrl: this.appUrl(),
      securityNote: "Si no realizaste este cambio, contacta a soporte de inmediato.",
      dedupeKey: `password_changed:${to}:${Math.floor(Date.now() / 60_000)}`,
    });
  }

  collaboratorInvited(to: string, name: string, business: string, role: string) {
    return this.send({
      to,
      name,
      template: "collaborator_invited",
      subject: `Te invitaron a operar ${business} en MiClub Chile`,
      title: "Tu acceso de colaborador está listo",
      intro: "Se creó un acceso para que puedas operar MiClub Chile en el comercio indicado.",
      details: [{ label: "Comercio", value: business }, { label: "Rol", value: role }],
      actionLabel: "Ingresar al panel",
      actionUrl: role === "CASHIER" ? this.cashierUrl() : this.commerceUrl(),
      securityNote: "Por seguridad no enviamos contraseñas en este correo. Usa la contraseña entregada por el administrador o solicita recuperación.",
      dedupeKey: `collaborator:${to}:${business}`,
    });
  }

  rewardEarned(to: string, name: string, business: string, reward: string, expiresAt?: Date | null) {
    return this.send({
      to,
      name,
      template: "reward_earned",
      subject: `Ganaste una recompensa en ${business}`,
      title: "¡Tienes una nueva recompensa!",
      intro: "Completaste el objetivo del programa y tu recompensa ya está disponible.",
      details: [
        { label: "Comercio", value: business },
        { label: "Recompensa", value: reward },
        { label: "Vigencia", value: expiresAt ? expiresAt.toLocaleDateString("es-CL") : "Sin vencimiento" },
      ],
      actionLabel: "Ver recompensa",
      actionUrl: `${this.appUrl()}/#/rewards`,
      dedupeKey: `reward_earned:${to}:${business}:${reward}:${Date.now()}`,
    });
  }

  rewardRedeemed(to: string, name: string, business: string, reward: string) {
    return this.send({
      to,
      name,
      template: "reward_redeemed",
      subject: `Recompensa canjeada en ${business}`,
      title: "Recompensa canjeada",
      intro: "Confirmamos que una recompensa fue canjeada correctamente.",
      details: [{ label: "Comercio", value: business }, { label: "Recompensa", value: reward }],
      securityNote: "Si no reconoces este canje, contacta a soporte para revisar el caso.",
      dedupeKey: `reward_redeemed:${to}:${business}:${reward}:${Math.floor(Date.now() / 60_000)}`,
    });
  }

  accountStatus(to: string, name: string, status: "suspended" | "reactivated") {
    const suspended = status === "suspended";
    return this.send({
      to,
      name,
      template: suspended ? "account_suspended" : "account_reactivated",
      subject: suspended ? "Tu cuenta MiClub Chile fue suspendida" : "Tu cuenta MiClub Chile fue reactivada",
      title: suspended ? "Cuenta suspendida" : "Cuenta reactivada",
      intro: suspended
        ? "Tu cuenta fue suspendida por el equipo administrativo. Contacta a soporte si necesitas más información."
        : "Tu cuenta fue reactivada y ya puedes volver a usar MiClub Chile.",
      actionLabel: suspended ? "Contactar soporte" : "Ingresar a MiClub",
      actionUrl: suspended ? `mailto:${this.supportEmail()}` : this.appUrl(),
      securityNote: "Este aviso fue generado por una acción administrativa registrada en auditoría.",
      dedupeKey: `account_${status}:${to}:${Math.floor(Date.now() / 60_000)}`,
    });
  }

  businessStatus(to: string, name: string, business: string, status: string) {
    return this.send({
      to,
      name,
      template: "business_status_changed",
      subject: `Estado actualizado para ${business}`,
      title: "Estado del comercio actualizado",
      intro: "El estado administrativo de tu comercio cambió en MiClub Chile.",
      details: [{ label: "Comercio", value: business }, { label: "Nuevo estado", value: status }],
      actionLabel: "Ir al panel comercio",
      actionUrl: this.commerceUrl(),
      securityNote: "Si no esperabas este cambio, contacta a soporte.",
      dedupeKey: `business_status:${to}:${business}:${status}:${Math.floor(Date.now() / 60_000)}`,
    });
  }

  adminNotice(to: string, name: string, title: string, intro: string, details?: Array<{ label: string; value: string }>) {
    return this.send({
      to,
      name,
      template: "admin_notice",
      subject: title,
      title,
      intro,
      details,
      actionLabel: "Abrir panel administrador",
      actionUrl: this.adminUrl(),
      dedupeKey: `admin:${to}:${title}:${Math.floor(Date.now() / 60_000)}`,
    });
  }

  private render(payload: EmailPayload) {
    const support = this.supportEmail();
    const logo = `${this.config.get<string>("FRONTEND_URL", "https://miclubchile.cl")}/logo-miclub-chile-transparent.png`;
    const details = payload.details?.map((item) => `<tr><td style="padding:10px 0;color:#64748b;font-size:13px">${this.escape(item.label)}</td><td style="padding:10px 0;text-align:right;color:#0f172a;font-weight:700">${this.escape(item.value)}</td></tr>`).join("") ?? "";
    const button = payload.actionUrl && payload.actionLabel
      ? `<a href="${this.escapeAttr(payload.actionUrl)}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:16px">${this.escape(payload.actionLabel)}</a>`
      : "";
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a"><div style="display:none;max-height:0;overflow:hidden">${this.escape(payload.intro)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #e2e8f0"><tr><td style="padding:28px 28px 16px;text-align:center;background:linear-gradient(135deg,#eef2ff,#ecfeff)"><img src="${this.escapeAttr(logo)}" width="92" alt="MiClub Chile" style="max-width:92px;border-radius:18px"><p style="margin:14px 0 0;color:#6d28d9;font-weight:900;letter-spacing:.12em;text-transform:uppercase;font-size:12px">MiClub Chile</p></td></tr><tr><td style="padding:30px 28px"><h1 style="margin:0;font-size:28px;line-height:1.12;color:#020617">${this.escape(payload.title)}</h1><p style="margin:18px 0 0;font-size:16px;line-height:1.65;color:#475569">Hola ${this.escape(payload.name)},</p><p style="margin:10px 0 0;font-size:16px;line-height:1.65;color:#475569">${this.escape(payload.intro)}</p>${details ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">${details}</table>` : ""}${button ? `<div style="margin:24px 0">${button}</div>` : ""}${payload.securityNote ? `<div style="margin-top:22px;background:#f1f5f9;border-radius:18px;padding:16px;color:#334155;font-size:13px;line-height:1.55"><strong>Aviso de seguridad:</strong> ${this.escape(payload.securityNote)}</div>` : ""}<p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.6">${this.escape(payload.supportNote ?? `¿Necesitas ayuda? Escríbenos a ${support}.`)}</p></td></tr></table><p style="max-width:560px;margin:16px auto 0;color:#94a3b8;font-size:12px;line-height:1.5;text-align:center">Este correo fue enviado por MiClub Chile. No respondas con contraseñas, códigos ni datos sensibles.</p></td></tr></table></body></html>`;
  }

  private allowedRecipient(to: string) {
    if (this.config.get<string>("NODE_ENV") === "production") return true;
    const allowlist = this.config.get<string>("STAGING_EMAIL_ALLOWLIST", "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (!allowlist.length) return false;
    const normalized = to.toLowerCase();
    return allowlist.some((allowed) => normalized === allowed || normalized.endsWith(`@${allowed.replace(/^@/, "")}`));
  }

  private isDuplicate(key: string) {
    const now = Date.now();
    const previous = this.dedupe.get(key);
    if (previous && previous > now) return true;
    this.dedupe.set(key, now + 5 * 60_000);
    return false;
  }

  private appUrl() { return this.config.get<string>("APP_URL") ?? this.config.get<string>("CUSTOMER_APP_URL", "https://app.miclubchile.cl"); }
  private commerceUrl() { return this.config.get<string>("COMMERCE_APP_URL", "https://comercio.miclubchile.cl"); }
  private cashierUrl() { return this.config.get<string>("CASHIER_APP_URL", "https://cajero.miclubchile.cl"); }
  private adminUrl() { return this.config.get<string>("ADMIN_APP_URL", "https://admin.miclubchile.cl"); }
  private supportEmail() { return this.config.get<string>("SUPPORT_EMAIL", "soporte@miclubchile.cl"); }
  private domain(email: string) { return email.split("@")[1] ?? "unknown"; }
  private escape(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string)); }
  private escapeAttr(value: string) { return this.escape(value); }
}
