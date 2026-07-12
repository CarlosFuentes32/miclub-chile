import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterUserDto } from "../users/dto/register-user.dto";
import { publicUserSelect, UsersService } from "../users/users.service";
import { RefreshTokenPayload } from "./auth.types";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  private readonly passwordResetAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterUserDto) {
    const user = await this.users.createCustomer(dto);
    await this.audit.create({
      userId: user.id,
      action: "customer_registered",
      entityType: "user",
      entityId: user.id,
      category: "customers",
      module: "auth",
      riskLevel: "medium",
      metadata: { source: "customer_register" },
    });
    void this.email.accountCreated(user.email, user.name, user.role);
    return this.createSession(user.id);
  }

  async login(dto: LoginDto) {
    const identifier = dto.email.trim().toLowerCase();
    const digits = identifier.replace(/\D/g, "");
    const phone = digits.length === 8 ? `+569${digits}` : identifier.startsWith("+") ? `+${digits}` : digits;
    const user = identifier.includes("@")
      ? await this.prisma.user.findUnique({ where: { email: identifier } })
      : await this.prisma.user.findFirst({ where: { phone } });
    if (!user) {
      await this.audit.create({
        action: "login_failed",
        entityType: "user",
        entityId: "unknown",
        category: "authentication",
        module: "auth",
        result: "failure",
        riskLevel: "medium",
        metadata: { reason: "not_found", identifierKind: identifier.includes("@") ? "email" : "phone" },
      });
      throw new UnauthorizedException("Teléfono o contraseña incorrecta.");
    }
    if (user.status === UserStatus.DELETED) {
      await this.audit.create({ userId: user.id, action: "login_denied_deleted_user", entityType: "user", entityId: user.id, category: "authentication", module: "auth", result: "denied", riskLevel: "high" });
      throw new UnauthorizedException("No puedes iniciar sesión. Cuenta eliminada. Contacta a soporte.");
    }
    if (user.status === UserStatus.SUSPENDED) {
      await this.audit.create({ userId: user.id, action: "login_denied_suspended_user", entityType: "user", entityId: user.id, category: "authentication", module: "auth", result: "denied", riskLevel: "high" });
      throw new UnauthorizedException("Cuenta suspendida. Contacta a soporte.");
    }
    if (user.status !== UserStatus.ACTIVE) {
      await this.audit.create({ userId: user.id, action: "login_denied_inactive_user", entityType: "user", entityId: user.id, category: "authentication", module: "auth", result: "denied", riskLevel: "medium" });
      throw new UnauthorizedException("No puedes iniciar sesión. Contacta a soporte MiClub Chile.");
    }
    if (user.lockedAt) {
      await this.audit.create({ userId: user.id, action: "login_denied_locked_user", entityType: "user", entityId: user.id, category: "authentication", module: "auth", result: "denied", riskLevel: "high" });
      throw new UnauthorizedException("Cuenta bloqueada. Contacta a Soporte MiClub Chile.");
    }
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      const attempts = user.failedLoginAttempts + 1;
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedAt: attempts >= 5 ? new Date() : null } });
      await this.audit.create({
        userId: user.id,
        action: attempts >= 5 ? "login_blocked_by_attempts" : "login_failed",
        entityType: "user",
        entityId: user.id,
        category: "authentication",
        module: "auth",
        result: "failure",
        riskLevel: attempts >= 5 ? "high" : "medium",
        metadata: { attempts },
      });
      throw new UnauthorizedException(attempts >= 5 ? "Cuenta bloqueada. Contacta a Soporte MiClub Chile." : "Correo o contraseña incorrecta.");
    }
    if (user.failedLoginAttempts) await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0 } });
    const session = await this.createSession(user.id);
    await this.audit.create({ userId: user.id, action: "login_success", entityType: "auth_session", entityId: "created", category: "authentication", module: "auth", riskLevel: "low", metadata: { role: user.role } });
    return session;
  }

  async refresh(token: string | undefined) {
    if (!token) throw new UnauthorizedException("Refresh token requerido");
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, { secret: this.config.getOrThrow("JWT_REFRESH_SECRET") });
    } catch {
      throw new UnauthorizedException("Refresh token inválido o vencido");
    }
    if (payload.type !== "refresh") throw new UnauthorizedException("Token inválido");

    const session = await this.prisma.authSession.findUnique({ where: { id: payload.sid }, include: { user: true } });
    const valid = session && !session.revokedAt && session.expiresAt > new Date() && session.user.status === UserStatus.ACTIVE && await bcrypt.compare(token, session.refreshTokenHash);
    if (!valid) throw new UnauthorizedException("Sesión inválida o revocada");

    await this.prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const next = await this.createSession(session.userId);
    await this.audit.create({ userId: session.userId, action: "refresh_token_rotated", entityType: "auth_session", entityId: session.id, category: "authentication", module: "auth", riskLevel: "low" });
    return next;
  }

  async logout(token: string | undefined) {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, { secret: this.config.getOrThrow("JWT_REFRESH_SECRET"), ignoreExpiration: true });
      await this.prisma.authSession.updateMany({ where: { id: payload.sid, userId: payload.sub, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.create({ userId: payload.sub, action: "logout", entityType: "auth_session", entityId: payload.sid, category: "authentication", module: "auth", riskLevel: "low" });
    } catch {
      /* La cookie se elimina aunque el token ya no sea válido. */
    }
  }

  async requestPasswordReset(identifier: string, source = "unknown") {
    const normalized = identifier.trim().toLowerCase();
    this.assertPasswordResetRateLimit(normalized, source);
    const digits = normalized.replace(/\D/g, "");
    const phone = digits.length === 8 ? `+569${digits}` : normalized.startsWith("+") ? `+${digits}` : digits;
    const user = normalized.includes("@")
      ? await this.prisma.user.findUnique({ where: { email: normalized } })
      : await this.prisma.user.findFirst({ where: { phone } });
    if (user && user.status === UserStatus.ACTIVE) {
      const token = randomBytes(32).toString("base64url");
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: await bcrypt.hash(token, 12),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      const appUrl = this.config.get<string>("APP_URL") ?? this.config.get<string>("CUSTOMER_APP_URL", "https://app.miclubchile.cl");
      const resetUrl = `${appUrl}/#/recover?token=${encodeURIComponent(token)}`;
      await this.email.passwordReset(user.email, user.name, resetUrl, `password_reset:${user.id}:${Math.floor(Date.now() / 60_000)}`);
    }
    await this.audit.create({
      userId: user?.id ?? null,
      action: "password_reset_requested",
      entityType: "user",
      entityId: user?.id ?? "unknown",
      category: "authentication",
      module: "auth",
      riskLevel: "medium",
      metadata: { exists: Boolean(user), source },
    });
    return { message: "Si los datos existen, recibirás instrucciones para recuperar tu contraseña." };
  }

  async confirmPasswordReset(token: string, password: string) {
    const candidates = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    for (const candidate of candidates) {
      if (await bcrypt.compare(token, candidate.tokenHash)) {
        if (candidate.user.status !== UserStatus.ACTIVE) throw new UnauthorizedException("Cuenta no disponible.");
        await this.prisma.$transaction([
          this.prisma.user.update({ where: { id: candidate.userId }, data: { passwordHash: await bcrypt.hash(password, 12), forcePasswordChange: false, failedLoginAttempts: 0, lockedAt: null } }),
          this.prisma.passwordResetToken.update({ where: { id: candidate.id }, data: { usedAt: new Date() } }),
          this.prisma.authSession.updateMany({ where: { userId: candidate.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
        void this.email.passwordChanged(candidate.user.email, candidate.user.name);
        await this.audit.create({ userId: candidate.userId, action: "password_reset_token_used", entityType: "user", entityId: candidate.userId, category: "authentication", module: "auth", riskLevel: "high" });
        await this.audit.create({ userId: candidate.userId, action: "password_changed", entityType: "user", entityId: candidate.userId, category: "authentication", module: "auth", riskLevel: "high" });
        return { message: "Contraseña actualizada correctamente. Inicia sesión nuevamente." };
      }
    }
    await this.audit.create({ action: "password_reset_token_rejected", entityType: "password_reset_token", entityId: "unknown", category: "authentication", module: "auth", result: "denied", riskLevel: "medium" });
    throw new UnauthorizedException("Token de recuperación inválido o vencido.");
  }

  private async createSession(userId: string) {
    const days = this.config.get<number>("JWT_REFRESH_EXPIRES_IN_DAYS", 7);
    const session = await this.prisma.authSession.create({ data: { userId, refreshTokenHash: "pending", expiresAt: new Date(Date.now() + days * 86_400_000) } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: publicUserSelect });
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, type: "access" }, { secret: this.config.getOrThrow("JWT_SECRET"), expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES_IN", "15m") as any });
    const refreshToken = await this.jwt.signAsync({ sub: user.id, sid: session.id, type: "refresh" }, { secret: this.config.getOrThrow("JWT_REFRESH_SECRET"), expiresIn: `${days}d` as any });
    await this.prisma.authSession.update({ where: { id: session.id }, data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) } });
    return { accessToken, refreshToken, refreshExpiresAt: session.expiresAt, user };
  }

  private assertPasswordResetRateLimit(identifier: string, source: string) {
    const key = `${source}:${identifier}`;
    const now = Date.now();
    const current = this.passwordResetAttempts.get(key);
    if (!current || current.resetAt <= now) {
      this.passwordResetAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
      return;
    }
    current.count += 1;
    if (current.count > 3) {
      throw new HttpException("Demasiadas solicitudes. Intenta nuevamente en unos minutos.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
