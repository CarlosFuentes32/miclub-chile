import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessStatus, MembershipStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMember(userId: string, businessId: string, roles: UserRole[] = [UserRole.CASHIER, UserRole.BUSINESS_ADMIN, UserRole.BUSINESS_OWNER]) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Comercio no encontrado');
    if (business.status !== BusinessStatus.ACTIVE) throw new ForbiddenException('El comercio no está activo');
    const member = await this.prisma.businessUser.findUnique({ where: { businessId_userId: { businessId, userId } } });
    if (!member || member.status !== MembershipStatus.ACTIVE || !roles.includes(member.role)) throw new ForbiddenException('No tienes permiso para operar en este comercio');
    return { business, member };
  }

  async requireManager(userId: string, businessId: string) { return this.requireMember(userId, businessId, [UserRole.BUSINESS_ADMIN, UserRole.BUSINESS_OWNER]); }
}
