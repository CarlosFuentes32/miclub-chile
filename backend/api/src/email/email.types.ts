export type EmailTemplate =
  | "account_created"
  | "password_reset"
  | "password_changed"
  | "collaborator_invited"
  | "reward_earned"
  | "reward_redeemed"
  | "account_suspended"
  | "account_reactivated"
  | "business_status_changed"
  | "billing_notice"
  | "admin_notice";

export interface EmailPayload {
  to: string;
  name: string;
  template: EmailTemplate;
  subject: string;
  title: string;
  intro: string;
  details?: Array<{ label: string; value: string }>;
  actionLabel?: string;
  actionUrl?: string;
  securityNote?: string;
  supportNote?: string;
  dedupeKey?: string;
}

export interface EmailResult {
  sent: boolean;
  skipped?: boolean;
  providerId?: string;
  reason?: string;
  status?: number;
}
