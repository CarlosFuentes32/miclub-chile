import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessTokenPayload, JwtUser } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: config.getOrThrow<string>('JWT_SECRET') });
  }

  async validate(payload: AccessTokenPayload): Promise<JwtUser> {
    if (payload.type !== 'access') throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        forcePasswordChange: true,
        businessMemberships: { where: { status: "ACTIVE" }, take: 1, select: { businessId: true } },
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Usuario inactivo o inexistente');
    return { id: user.id, email: user.email, role: user.role, forcePasswordChange:user.forcePasswordChange, businessId: user.businessMemberships[0]?.businessId ?? payload.businessId };
  }
}
