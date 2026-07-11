import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentProvider, WebhookEventStatus } from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Controller("billing/webhooks")
export class BillingWebhookController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  @Post(":provider")
  async receive(
    @Param("provider") providerParam: string,
    @Headers("x-miclub-signature") signature: string | undefined,
    @Body() body: any,
  ) {
    const provider = this.provider(providerParam ?? body?.provider);
    const eventId = String(body?.id ?? body?.event_id ?? "");
    const eventType = String(body?.type ?? body?.event_type ?? "unknown");
    const secret = this.config.get<string>("BILLING_WEBHOOK_SECRET");
    const signatureValid = Boolean(secret && signature && this.verifySignature(secret, signature, body));
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
        error: signatureValid ? null : "invalid_or_missing_signature",
      },
    });
    return { accepted: signatureValid, event_id: row.eventId, status: row.status };
  }

  private provider(value: string | undefined): PaymentProvider {
    const normalized = (value ?? "").toLowerCase();
    if (normalized.includes("flow")) return PaymentProvider.FLOW;
    if (normalized.includes("mercado")) return PaymentProvider.MERCADO_PAGO;
    return PaymentProvider.MANUAL;
  }

  private verifySignature(secret: string, signature: string, body: unknown) {
    const expected = createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
