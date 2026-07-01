import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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

  requestPasswordReset() {
    return { message: 'Si los datos existen, recibirás instrucciones para recuperar tu contraseña.' };
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
