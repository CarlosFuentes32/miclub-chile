import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { hashValue, sanitizeJson } from "../enterprise-logging/sensitive-data";
import { RateLimitResult, RateLimitRule } from "./security.types";

@Injectable()
export class DistributedRateLimitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async consume(rule: RateLimitRule): Promise<RateLimitResult> {
    if (this.config.get<string>("RATE_LIMIT_DISABLED") === "true") {
      return { allowed: true, scope: rule.scope, key: "disabled", count: 0, limit: rule.limit, resetAt: new Date() };
    }
    const now = new Date();
    const resetAt = new Date(now.getTime() + rule.windowSeconds * 1000);
    const subjectHash = hashValue(rule.subject);
    const key = `${rule.scope}:${subjectHash}`;
    const current = await this.prisma.rateLimitBucket.findUnique({ where: { key } });
    const bucket = !current || current.resetAt <= now
      ? await this.prisma.rateLimitBucket.upsert({
          where: { key },
          update: { count: 1, resetAt, subject: subjectHash, scope: rule.scope },
          create: { key, scope: rule.scope, subject: subjectHash, count: 1, resetAt },
        })
      : await this.prisma.rateLimitBucket.update({
          where: { key },
          data: { count: { increment: 1 } },
        });
    const allowed = bucket.count <= rule.limit;
    if (!allowed) {
      await this.audit.create({
        action: "rate_limit_triggered",
        entityType: "rate_limit",
        entityId: key,
        category: "security",
        module: "rate-limit",
        result: "denied",
        riskLevel: rule.risk,
        metadata: sanitizeJson({ scope: rule.scope, limit: rule.limit, count: bucket.count, resetAt: bucket.resetAt }),
      }).catch(() => undefined);
    }
    return { allowed, scope: rule.scope, key, count: bucket.count, limit: rule.limit, resetAt: bucket.resetAt };
  }

  async dryRunPolicy() {
    return {
      provider: "postgresql",
      distributed: true,
      destructiveActionExecuted: false,
      rules: {
        loginIp: this.ruleLimit("RATE_LIMIT_LOGIN_IP", 20, 900),
        loginAccount: this.ruleLimit("RATE_LIMIT_LOGIN_ACCOUNT", 8, 900),
        passwordReset: this.ruleLimit("RATE_LIMIT_PASSWORD_RESET", 5, 900),
        register: this.ruleLimit("RATE_LIMIT_REGISTER", 10, 3600),
        refresh: this.ruleLimit("RATE_LIMIT_REFRESH", 120, 900),
        sensitiveSearch: this.ruleLimit("RATE_LIMIT_SENSITIVE_SEARCH", 60, 300),
        export: this.ruleLimit("RATE_LIMIT_EXPORT", 10, 3600),
        criticalOperation: this.ruleLimit("RATE_LIMIT_CRITICAL_OPERATION", 30, 900),
      },
    };
  }

  ruleLimit(env: string, fallbackLimit: number, fallbackWindowSeconds: number) {
    const raw = this.config.get<string>(env);
    if (!raw) return { limit: fallbackLimit, windowSeconds: fallbackWindowSeconds };
    const [limit, windowSeconds] = raw.split(":").map(Number);
    return { limit: Number.isFinite(limit) ? limit : fallbackLimit, windowSeconds: Number.isFinite(windowSeconds) ? windowSeconds : fallbackWindowSeconds };
  }
}

