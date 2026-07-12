import { createHash } from "crypto";

export const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /currentPassword/i,
  /newPassword/i,
  /passwordHash/i,
  /^token$/i,
  /accessToken/i,
  /refreshToken/i,
  /authorization/i,
  /cookie/i,
  /secret/i,
  /apiKey/i,
  /databaseUrl/i,
  /DATABASE_URL/i,
  /webhookSecret/i,
];

const REDACTED = "[redacted]";

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!domain) return REDACTED;
  return `${name.slice(0, 2)}***@${domain}`;
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return REDACTED;
  return `***${digits.slice(-4)}`;
}

export function maskRut(value: string) {
  const clean = value.replace(/[^0-9kK]/g, "");
  if (clean.length < 3) return REDACTED;
  return `***${clean.slice(-3)}`;
}

export function sanitizeText(value?: string | null, maxLength = 2_000) {
  if (!value) return undefined;
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgres://[redacted]")
    .replace(/(DATABASE_URL|JWT_SECRET|JWT_REFRESH_SECRET|RESEND_API_KEY|API_KEY|SECRET)=([^&\s"']+)/gi, "$1=[redacted]")
    .replace(/(api[_-]?key|token|secret|password|cookie|authorization)=([^&\s"']+)/gi, "$1=[redacted]")
    .replace(/[A-Za-z]:\\[^\s)]+/g, "[local-path-redacted]")
    .slice(0, maxLength);
}

export function isSensitiveField(key: string) {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

export function sanitizeJson<T = unknown>(value: T, maxLength = 8_000): T {
  const seen = new WeakSet<object>();
  const sanitized = JSON.stringify(value, (key, val: unknown) => {
    if (key && isSensitiveField(key)) return REDACTED;
    if (typeof val === "string") {
      const text = sanitizeText(val, 1_000) ?? "";
      if (/@/.test(key) || key.toLowerCase().includes("email")) return maskEmail(text);
      if (key.toLowerCase().includes("phone") || key.toLowerCase().includes("telefono")) return maskPhone(text);
      if (key.toLowerCase().includes("rut")) return maskRut(text);
      return text;
    }
    if (typeof val === "bigint") return val.toString();
    if (val && typeof val === "object") {
      if (seen.has(val)) return "[circular]";
      seen.add(val);
    }
    return val;
  });
  return JSON.parse(sanitized.slice(0, maxLength)) as T;
}

export function csvSafe(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

