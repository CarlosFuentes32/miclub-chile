import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RewardStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BusinessAccessService } from '../businesses/business-access.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService, private readonly access: BusinessAccessService, private readonly audit: AuditService) {}
  async redeem(userId: string, rewardId: string, businessId: string) {
    await this.access.requireMember(userId, businessId);
    return this.prisma.$transaction(async tx => {
      const reward = await tx.reward.findUnique({ where: { id: rewardId } });
      if (!reward || reward.businessId !== businessId) throw new NotFoundException('Recompensa no encontrada en este comercio');
      if (reward.expiresAt && reward.expiresAt <= new Date()) { await tx.reward.update({ where: { id: reward.id }, data: { status: RewardStatus.EXPIRED } }); throw new ConflictException('La recompensa está vencida'); }
      if (reward.status !== RewardStatus.AVAILABLE) throw new ConflictException('La recompensa no está disponible');
      const redeemed = await tx.reward.update({ where: { id: reward.id }, data: { status: RewardStatus.REDEEMED, redeemedAt: new Date(), redeemedByUserId: userId } });
      await this.audit.create({ userId, businessId, action: 'reward_redeemed', entityType: 'reward', entityId: reward.id }, tx);
      return { reward_id: redeemed.id, status: redeemed.status, redeemed_at: redeemed.redeemedAt };
    });
  }
}
