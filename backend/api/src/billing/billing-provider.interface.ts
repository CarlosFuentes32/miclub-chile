import { PaymentProvider, PaymentStatus } from "@prisma/client";

export interface BillingProviderPayment {
  provider: PaymentProvider;
  providerPaymentId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  reference?: string;
  raw?: Record<string, unknown>;
}

export interface BillingProviderWebhookResult {
  accepted: boolean;
  idempotencyKey: string;
  payment?: BillingProviderPayment;
  reason?: string;
}

export interface BillingProvider {
  readonly provider: PaymentProvider;
  createSubscription(input: {
    businessId: string;
    planId: string;
    amount: number;
    currency: string;
  }): Promise<{ externalSubscriptionId?: string; paymentUrl?: string; status: string }>;
  getSubscriptionStatus(externalSubscriptionId: string): Promise<string>;
  cancelSubscription(externalSubscriptionId: string): Promise<{ cancelled: boolean }>;
  getPayment(providerPaymentId: string): Promise<BillingProviderPayment>;
  refundPayment(providerPaymentId: string, amount?: number): Promise<BillingProviderPayment>;
  verifyWebhookSignature(input: { headers: Record<string, string | undefined>; rawBody: string }): boolean;
  processWebhook(input: { headers: Record<string, string | undefined>; body: unknown; rawBody: string }): Promise<BillingProviderWebhookResult>;
}
