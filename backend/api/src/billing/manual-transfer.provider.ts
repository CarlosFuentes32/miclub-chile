import { Injectable } from "@nestjs/common";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { BillingProvider, BillingProviderPayment, BillingProviderWebhookResult } from "./billing-provider.interface";

@Injectable()
export class ManualTransferProvider implements BillingProvider {
  readonly provider = PaymentProvider.MANUAL;

  async createSubscription() {
    return {
      status: "manual_review_required",
    };
  }

  async getSubscriptionStatus() {
    return "manual";
  }

  async cancelSubscription() {
    return { cancelled: false };
  }

  async getPayment(providerPaymentId: string): Promise<BillingProviderPayment> {
    return {
      provider: PaymentProvider.MANUAL,
      providerPaymentId,
      status: PaymentStatus.PENDING,
      amount: 0,
      currency: "CLP",
      reference: providerPaymentId,
      raw: { note: "Manual transfers must be reviewed by Super Admin before approval." },
    };
  }

  async refundPayment(providerPaymentId: string): Promise<BillingProviderPayment> {
    return {
      provider: PaymentProvider.MANUAL,
      providerPaymentId,
      status: PaymentStatus.REVERSED,
      amount: 0,
      currency: "CLP",
      reference: providerPaymentId,
      raw: { note: "Manual transfer reversal is an audited administrative operation, not a provider refund." },
    };
  }

  verifyWebhookSignature() {
    return false;
  }

  async processWebhook(): Promise<BillingProviderWebhookResult> {
    return {
      accepted: false,
      idempotencyKey: "manual:webhook:not-supported",
      reason: "ManualTransferProvider does not accept real payment webhooks.",
    };
  }
}
