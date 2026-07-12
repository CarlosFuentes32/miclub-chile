import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentProvider, WebhookEventStatus } from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Controller("billing/webhooks")
export class BillingWebhookController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly audit: AuditService) {}

  @Post(":provider")
  async receive(
    @Param("provider") providerParam: string,
    @Headers("x-miclub-signature") signature: string | undefined,
    @Headers("x-miclub-timestamp") timestamp: string | undefined,
    @Body() body: any,
  ) {
    const provider = this.provider(providerParam ?? body?.provider);
    const eventId = String(body?.id ?? body?.event_id ?? "");
    const eventType = String(body?.type ?? body?.event_type ?? "unknown");
    const secret = this.config.get<string>("BILLING_WEBHOOK_SECRET");
    const fresh = this.freshTimestamp(timestamp);
    const signatureValid = Boolean(secret && signature && fresh && this.verifySignature(secret, signature, timestamp, body));
    if (!eventId) return { accepted: false, reason: "missing_event_id" };
    const existing = await this.prisma.billingWebhookEvent.findUnique({ where: { provider_eventId: { provider, eventId } } });
    if (existing) return { accepted: true, idempotent: true, status: existing.status };
    const row = await this.prisma.billingWebhookEvent.create({
      data: {
        provider,
        eventId,
        eventType,
        signatureValid,
        payload: body,
        status: signatureValid ? WebhookEventStatus.RECEIVED : WebhookEventStatus.FAILED,
        error: signatureValid ? null : fresh ? "invalid_or_missing_signature" : "stale_or_missing_timestamp",
      },
    });
    await this.audit.create({
      action: signatureValid ? "billing_webhook_received" : "billing_webhook_rejected",
      entityType: "billing_webhook_event",
      entityId: row.id,
      category: "billing",
      module: "webhooks",
      result: signatureValid ? "success" : "denied",
      riskLevel: signatureValid ? "medium" : "high",
      metadata: { provider, eventType, signatureValid, fresh },
    }).catch(() => undefined);
    return { accepted: signatureValid, event_id: row.eventId, status: row.status };
  }

  private provider(value: string | undefined): PaymentProvider {
    const normalized = (value ?? "").toLowerCase();
    if (normalized.includes("flow")) return PaymentProvider.FLOW;
    if (normalized.includes("mercado")) return PaymentProvider.MERCADO_PAGO;
    return PaymentProvider.MANUAL;
  }

  private freshTimestamp(timestamp?: string) {
    if (!timestamp) return false;
    const value = Number(timestamp);
    if (!Number.isFinite(value)) return false;
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    return Math.abs(Date.now() - ms) <= 5 * 60_000;
  }

  private verifySignature(secret: string, signature: string, timestamp: string | undefined, body: unknown) {
    const expected = createHmac("sha256", secret).update(`${timestamp}.${JSON.stringify(body)}`).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
