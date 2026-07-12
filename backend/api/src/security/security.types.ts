export interface RateLimitRule {
  scope: string;
  limit: number;
  windowSeconds: number;
  subject: string;
  risk: "low" | "medium" | "high" | "critical";
}

export interface RateLimitResult {
  allowed: boolean;
  scope: string;
  key: string;
  count: number;
  limit: number;
  resetAt: Date;
}

