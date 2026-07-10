import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { publicUserSelect, UsersService } from '../users/users.service';
import { RefreshTokenPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly users: UsersService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async register(dto: RegisterUserDto) {
    const user = await this.users.createCustomer(dto);
    return this.createSession(user.id);
  }

  async login(dto: LoginDto) {
    const identifier = dto.email.trim().toLowerCase();
    const digits = identifier.replace(/\D/g, '');
    const phone = digits.length === 8 ? `+569${digits}` : identifier.startsWith('+') ? `+${digits}` : digits;
    const user = identifier.includes('@')
      ? await this.prisma.user.findUnique({ where: { email: identifier } })
      : await this.prisma.user.findFirst({ where: { phone } });
    if (!user) throw new UnauthorizedException('Teléfono o contraseña incorrecta.');
    if (user.status === UserStatus.DELETED) throw new UnauthorizedException('No puedes iniciar sesión. Cuenta eliminada. Contacta a soporte.');
    if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedException('Cuenta suspendida. Contacta a soporte.');
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('No puedes iniciar sesión. Contacta a soporte MiClub Chile.');
    if (user.lockedAt) throw new UnauthorizedException('Cuenta bloqueada. Contacta a Soporte MiClub Chile.');
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      const attempts = user.failedLoginAttempts + 1;
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedAt: attempts >= 5 ? new Date() : null } });
      throw new UnauthorizedException(attempts >= 5 ? 'Cuenta bloqueada. Contacta a Soporte MiClub Chile.' : 'Correo o contraseña incorrecta.');
    }
    if (user.failedLoginAttempts) await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0 } });
    return this.createSession(user.id);
  }

  async refresh(token: string | undefined) {
    if (!token) throw new UnauthorizedException('Refresh token requerido');
    let payload: RefreshTokenPayload;
    try { payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') }); }
    catch { throw new UnauthorizedException('Refresh token inválido o vencido'); }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Token inválido');

    const session = await this.prisma.authSession.findUnique({ where: { id: payload.sid }, include: { user: true } });
    const valid = session && !session.revokedAt && session.expiresAt > new Date() && session.user.status === UserStatus.ACTIVE && await bcrypt.compare(token, session.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Sesión inválida o revocada');

    await this.prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return this.createSession(session.userId);
  }

  async logout(token: string | undefined) {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), ignoreExpiration: true });
      await this.prisma.authSession.updateMany({ where: { id: payload.sid, userId: payload.sub, revokedAt: null }, data: { revokedAt: new Date() } });
    } catch { /* La cookie se elimina aunque el token ya no sea válido. */ }
  }

  async requestPasswordReset(identifier: string) {
    const normalized = identifier.trim().toLowerCase();
    const digits = normalized.replace(/\D/g, '');
    const phone = digits.length === 8 ? `+569${digits}` : normalized.startsWith('+') ? `+${digits}` : digits;
    const user = normalized.includes('@')
      ? await this.prisma.user.findUnique({ where: { email: normalized } })
      : await this.prisma.user.findFirst({ where: { phone } });
    if (user && user.status === UserStatus.ACTIVE) {
      const token = randomBytes(32).toString('base64url');
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: await bcrypt.hash(token, 12),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      await this.sendPasswordResetEmail(user.email, user.name, token);
    }
    return { message: 'Si los datos existen, recibirás instrucciones para recuperar tu contraseña.' };
  }

  async confirmPasswordReset(token: string, password: string) {
    const candidates = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    for (const candidate of candidates) {
      if (await bcrypt.compare(token, candidate.tokenHash)) {
        if (candidate.user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Cuenta no disponible.');
        await this.prisma.$transaction([
          this.prisma.user.update({ where: { id: candidate.userId }, data: { passwordHash: await bcrypt.hash(password, 12), forcePasswordChange: false, failedLoginAttempts: 0, lockedAt: null } }),
          this.prisma.passwordResetToken.update({ where: { id: candidate.id }, data: { usedAt: new Date() } }),
          this.prisma.authSession.updateMany({ where: { userId: candidate.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
        return { message: 'Contraseña actualizada correctamente. Inicia sesión nuevamente.' };
      }
    }
    throw new UnauthorizedException('Token de recuperación inválido o vencido.');
  }

  private async sendPasswordResetEmail(email: string, name: string, token: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM', 'MiClub Chile <no-reply@miclubchile.cl>');
    const customerUrl = this.config.get<string>('CUSTOMER_APP_URL', 'https://app.miclubchile.cl');
    const resetUrl = `${customerUrl}/#/recover?token=${encodeURIComponent(token)}`;
    if (!apiKey) return;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'Recupera tu contraseña de MiClub Chile',
        html: `<p>Hola ${name},</p><p>Para crear una nueva contraseña, abre este enlace:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>El enlace vence en 30 minutos.</p>`,
      }),
    }).catch(() => undefined);
  }

  private async createSession(userId: string) {
    const days = this.config.get<number>('JWT_REFRESH_EXPIRES_IN_DAYS', 7);
    const session = await this.prisma.authSession.create({ data: { userId, refreshTokenHash: 'pending', expiresAt: new Date(Date.now() + days * 86_400_000) } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: publicUserSelect });
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, type: 'access' }, { secret: this.config.getOrThrow('JWT_SECRET'), expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as any });
    const refreshToken = await this.jwt.signAsync({ sub: user.id, sid: session.id, type: 'refresh' }, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: `${days}d` as any });
    await this.prisma.authSession.update({ where: { id: session.id }, data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) } });
    return { accessToken, refreshToken, refreshExpiresAt: session.expiresAt, user };
  }
}
