import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import { DistributedRateLimitService } from "./rate-limit.service";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function clientIp(request: Request) {
  const forwarded = request.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.ip || request.socket.remoteAddress || "unknown";
}

function identifierFromBody(request: Request) {
  const body = request.body as { email?: string; identifier?: string; phone?: string } | undefined;
  return (body?.email ?? body?.identifier ?? body?.phone ?? "unknown").toString().toLowerCase().trim();
}

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(_request: Request, response: Response, next: NextFunction) {
    const production = this.config.get<string>("NODE_ENV") === "production";
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (production) response.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    next();
  }
}

@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(request: Request, response: Response, next: NextFunction) {
    if (SAFE_METHODS.has(request.method)) return next();
    const origin = request.header("origin");
    const referer = request.header("referer");
    const allowed = this.allowedOrigins();
    if (!origin && !referer) return next();
    const source = origin ?? referer;
    try {
      const normalized = new URL(source as string).origin;
      if (allowed.has(normalized)) return next();
    } catch {
      return response.status(403).json({ message: "Origen no autorizado.", requestId: response.getHeader("X-Request-ID") });
    }
    return response.status(403).json({ message: "Origen no autorizado.", requestId: response.getHeader("X-Request-ID") });
  }

  private allowedOrigins() {
    return new Set(
      (this.config.get<string>("CORS_ORIGIN", "") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }
}

@Injectable()
export class DistributedRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly limits: DistributedRateLimitService) {}

  async use(request: Request, response: Response, next: NextFunction) {
    const path = request.originalUrl ?? request.url;
    const ip = clientIp(request);
    const rules = this.rulesFor(request.method, path, ip, identifierFromBody(request));
    for (const rule of rules) {
      const result = await this.limits.consume(rule);
      response.setHeader(`X-RateLimit-${rule.scope}-Limit`, String(result.limit));
      response.setHeader(`X-RateLimit-${rule.scope}-Remaining`, String(Math.max(0, result.limit - result.count)));
      response.setHeader(`X-RateLimit-${rule.scope}-Reset`, result.resetAt.toISOString());
      if (!result.allowed) {
        return response.status(429).json({
          message: "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
          requestId: response.getHeader("X-Request-ID"),
        });
      }
    }
    return next();
  }

  private rulesFor(method: string, path: string, ip: string, account: string) {
    const unsafe = !SAFE_METHODS.has(method);
    const rules = [];
    if (path.includes("/auth/login")) {
      rules.push({ scope: "login_ip", limit: 20, windowSeconds: 900, subject: ip, risk: "high" as const });
      rules.push({ scope: "login_account", limit: 8, windowSeconds: 900, subject: account, risk: "high" as const });
      rules.push({ scope: "login_ip_account", limit: 6, windowSeconds: 900, subject: `${ip}:${account}`, risk: "high" as const });
    } else if (path.includes("/auth/password-reset/request")) {
      rules.push({ scope: "password_reset", limit: 5, windowSeconds: 900, subject: `${ip}:${account}`, risk: "medium" as const });
    } else if (path.includes("/auth/register")) {
      rules.push({ scope: "register", limit: 10, windowSeconds: 3600, subject: `${ip}:${account}`, risk: "medium" as const });
    } else if (path.includes("/auth/refresh")) {
      rules.push({ scope: "refresh", limit: 120, windowSeconds: 900, subject: ip, risk: "medium" as const });
    } else if (/search|customers|audit|errors/i.test(path) && method === "GET") {
      rules.push({ scope: "sensitive_search", limit: 60, windowSeconds: 300, subject: `${ip}:${path.split("?")[0]}`, risk: "medium" as const });
    } else if (/export/i.test(path)) {
      rules.push({ scope: "export", limit: 10, windowSeconds: 3600, subject: `${ip}:${path}`, risk: "high" as const });
    } else if (unsafe && /backups|restore|rollback|impersonation|billing|reactivate|delete|webhooks|redeem/i.test(path)) {
      rules.push({ scope: "critical_operation", limit: 30, windowSeconds: 900, subject: `${ip}:${path.split("?")[0]}`, risk: "high" as const });
    }
    return rules;
  }
}

