import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CycleStatus, Prisma, ProgramStatus, RewardStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BusinessAccessService } from '../businesses/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessRewardDto, UpdateBusinessRewardDto } from './dto/manage-reward.dto';

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

  async createManual(userId: string, dto: CreateBusinessRewardDto) {
    await this.access.requireManager(userId, dto.business_id);
    return this.prisma.$transaction(async tx => {
      const membership = await tx.customerBusiness.findUnique({ where: { customerUserId_businessId: { customerUserId: dto.customer_user_id, businessId: dto.business_id } } });
      if (!membership) throw new NotFoundException('Cliente no inscrito en este comercio');
      const program = await tx.loyaltyProgram.findFirst({ where: { businessId: dto.business_id, status: ProgramStatus.ACTIVE }, orderBy: { version: 'desc' } });
      if (!program) throw new ConflictException('El comercio no tiene un programa activo');
      let cycle = await tx.cycle.findFirst({ where: { businessId: dto.business_id, customerUserId: dto.customer_user_id, status: CycleStatus.ACTIVE }, orderBy: { createdAt: 'desc' } });
      if (!cycle) {
        cycle = await tx.cycle.create({ data: { businessId: dto.business_id, customerUserId: dto.customer_user_id, loyaltyProgramId: program.id, currentValue: new Prisma.Decimal(0), targetValue: program.targetValue } });
      }
      const reward = await tx.reward.create({
        data: {
          businessId: dto.business_id,
          customerUserId: dto.customer_user_id,
          cycleId: cycle.id,
          rewardDescription: dto.reward_description,
          expiresAt: dto.expires_at ? new Date(dto.expires_at) : null,
          status: RewardStatus.AVAILABLE,
        },
      });
      await this.audit.create({ userId, businessId: dto.business_id, action: 'reward_created_manual', entityType: 'reward', entityId: reward.id }, tx);
      return reward;
    });
  }

  async updateBusinessReward(userId: string, rewardId: string, dto: UpdateBusinessRewardDto) {
    await this.access.requireManager(userId, dto.business_id);
    const reward = await this.prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.businessId !== dto.business_id) throw new NotFoundException('Recompensa no encontrada en este comercio');
    if (reward.status !== RewardStatus.AVAILABLE) throw new ConflictException('Solo se pueden editar recompensas disponibles');
    const updated = await this.prisma.reward.update({
      where: { id: rewardId },
      data: {
        rewardDescription: dto.reward_description,
        expiresAt: dto.expires_at ? new Date(dto.expires_at) : undefined,
      },
    });
    await this.audit.create({ userId, businessId: dto.business_id, action: 'reward_updated', entityType: 'reward', entityId: rewardId });
    return updated;
  }

  async cancelBusinessReward(userId: string, rewardId: string, businessId: string) {
    await this.access.requireManager(userId, businessId);
    const reward = await this.prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.businessId !== businessId) throw new NotFoundException('Recompensa no encontrada en este comercio');
    if (reward.status === RewardStatus.REDEEMED) throw new ConflictException('No se puede cancelar una recompensa ya canjeada');
    const cancelled = await this.prisma.reward.update({ where: { id: rewardId }, data: { status: RewardStatus.CANCELLED } });
    await this.audit.create({ userId, businessId, action: 'reward_cancelled', entityType: 'reward', entityId: rewardId });
    return cancelled;
  }
}
