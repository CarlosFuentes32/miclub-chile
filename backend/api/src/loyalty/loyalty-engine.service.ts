import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccumulationType, CycleStatus, MembershipStatus, Prisma, ProgramStatus, RewardStatus, TransactionStatus, TransactionType, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BusinessAccessService } from '../businesses/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

export interface RegisterTransactionInput { businessId: string; customerUserId: string; performedByUserId: string; value?: number; amount?: number; }

@Injectable()
export class LoyaltyEngineService {
  constructor(private readonly prisma: PrismaService, private readonly access: BusinessAccessService, private readonly audit: AuditService, private readonly email: EmailService) {}

  async register(input: RegisterTransactionInput) {
    await this.access.requireMember(input.performedByUserId, input.businessId);
    return this.prisma.$transaction(async tx => {
      const [customer, program] = await Promise.all([
        tx.user.findUnique({ where: { id: input.customerUserId }, include: { customerBusinesses: { where: { businessId: input.businessId, status: MembershipStatus.ACTIVE } } } }),
        tx.loyaltyProgram.findFirst({ where: { businessId: input.businessId, status: ProgramStatus.ACTIVE }, orderBy: { version: 'desc' } }),
      ]);
      if (!customer || customer.status !== UserStatus.ACTIVE) throw new NotFoundException('Cliente no encontrado o inactivo');
      if (!customer.customerBusinesses.length) throw new NotFoundException('El cliente no está inscrito en este comercio');
      if (!program) throw new NotFoundException('El comercio no tiene un programa activo');
      const increment = this.resolveIncrement(program.accumulationType, input.value, input.amount);
      let cycle = await tx.cycle.findFirst({ where: { customerUserId: customer.id, businessId: input.businessId, status: CycleStatus.ACTIVE }, orderBy: { createdAt: 'desc' } });
      if (!cycle) {
        cycle = await tx.cycle.create({ data: { customerUserId: customer.id, businessId: input.businessId, loyaltyProgramId: program.id, targetValue: program.targetValue } });
        await this.audit.create({ userId: input.performedByUserId, businessId: input.businessId, action: 'cycle_created', entityType: 'cycle', entityId: cycle.id }, tx);
      }
      const previous = Number(cycle.currentValue);
      const target = Number(cycle.targetValue);
      const completed = previous + increment >= target;
      const transaction = await tx.transaction.create({ data: { cycleId: cycle.id, businessId: input.businessId, customerUserId: customer.id, performedByUserId: input.performedByUserId, transactionType: this.transactionType(program.accumulationType), previousValue: new Prisma.Decimal(previous), valueAdded: new Prisma.Decimal(increment), amountOptional: input.amount === undefined ? undefined : new Prisma.Decimal(input.amount) } });
      await this.audit.create({ userId: input.performedByUserId, businessId: input.businessId, action: 'transaction_created', entityType: 'transaction', entityId: transaction.id, metadata: { previous_progress: previous, value_added: increment } }, tx);

      let reward = null;
      let newCycle = null;
      if (completed) {
        await tx.cycle.update({ where: { id: cycle.id }, data: { currentValue: cycle.targetValue, status: CycleStatus.COMPLETED, completedAt: new Date() } });
        await this.audit.create({ userId: input.performedByUserId, businessId: input.businessId, action: 'cycle_completed', entityType: 'cycle', entityId: cycle.id }, tx);
        const expiresAt = program.rewardExpirationDays ? new Date(Date.now() + program.rewardExpirationDays * 86_400_000) : undefined;
        reward = await tx.reward.create({ data: { cycleId: cycle.id, businessId: input.businessId, customerUserId: customer.id, rewardDescription: program.rewardDescription, expiresAt } });
        await this.audit.create({ userId: input.performedByUserId, businessId: input.businessId, action: 'reward_generated', entityType: 'reward', entityId: reward.id }, tx);
        const business = await tx.business.findUnique({ where: { id: input.businessId }, select: { name: true } });
        if (business) void this.email.rewardEarned(customer.email, customer.name, business.name, reward.rewardDescription, reward.expiresAt);
        newCycle = await tx.cycle.create({ data: { customerUserId: customer.id, businessId: input.businessId, loyaltyProgramId: program.id, currentValue: 0, targetValue: program.targetValue } });
        await this.audit.create({ userId: input.performedByUserId, businessId: input.businessId, action: 'cycle_created', entityType: 'cycle', entityId: newCycle.id, metadata: { source: 'cycle_completion' } }, tx);
      } else {
        await tx.cycle.update({ where: { id: cycle.id }, data: { currentValue: new Prisma.Decimal(previous + increment) } });
      }
      return { transaction_id: transaction.id, customer: { id: customer.id, name: customer.name, phone: customer.phone }, previous_progress: previous, new_progress: completed ? 0 : previous + increment, target_value: target, reward_unlocked: completed, reward_description: reward?.rewardDescription, reward_id: reward?.id, current_cycle_id: newCycle?.id ?? cycle.id, new_cycle_created: Boolean(newCycle) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancel(transactionId: string, userId: string) {
    const target = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!target) throw new NotFoundException('Transacción no encontrada');
    await this.access.requireMember(userId, target.businessId);
    return this.prisma.$transaction(async tx => {
      const transaction = await tx.transaction.findUniqueOrThrow({ where: { id: transactionId }, include: { cycle: true } });
      if (transaction.status !== TransactionStatus.VALID) throw new ConflictException('La transacción ya está anulada');
      const latest = await tx.transaction.findFirst({ where: { customerUserId: transaction.customerUserId, businessId: transaction.businessId, status: TransactionStatus.VALID }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      if (latest?.id !== transaction.id) throw new ConflictException('Solo se puede anular la última transacción válida del cliente');
      const reward = await tx.reward.findFirst({ where: { cycleId: transaction.cycleId } });
      if (reward?.status === RewardStatus.REDEEMED) throw new ConflictException('No se puede anular: la recompensa generada ya fue canjeada');
      if (reward) await tx.reward.update({ where: { id: reward.id }, data: { status: RewardStatus.CANCELLED } });
      if (transaction.cycle.status === CycleStatus.COMPLETED) {
        const nextCycle = await tx.cycle.findFirst({ where: { customerUserId: transaction.customerUserId, businessId: transaction.businessId, status: CycleStatus.ACTIVE, createdAt: { gte: transaction.createdAt } }, orderBy: { createdAt: 'asc' } });
        if (nextCycle) await tx.cycle.update({ where: { id: nextCycle.id }, data: { status: CycleStatus.CANCELLED } });
        await tx.cycle.update({ where: { id: transaction.cycleId }, data: { status: CycleStatus.ACTIVE, completedAt: null, currentValue: transaction.previousValue } });
      } else await tx.cycle.update({ where: { id: transaction.cycleId }, data: { currentValue: transaction.previousValue } });
      const cancelled = await tx.transaction.update({ where: { id: transaction.id }, data: { status: TransactionStatus.CANCELLED, cancelledAt: new Date(), cancelledByUserId: userId } });
      await this.audit.create({ userId, businessId: transaction.businessId, action: 'transaction_cancelled', entityType: 'transaction', entityId: transaction.id, metadata: { reward_cancelled: Boolean(reward) } }, tx);
      return { transaction_id: cancelled.id, status: cancelled.status, restored_progress: Number(transaction.previousValue), reward_cancelled: Boolean(reward) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private resolveIncrement(type: AccumulationType, value?: number, amount?: number) {
    if (type === AccumulationType.AMOUNT_SPENT) { if (!amount || amount <= 0) throw new BadRequestException('amount debe ser mayor que 0'); return amount; }
    if (type === AccumulationType.PURCHASE_COUNT || type === AccumulationType.VISIT_COUNT) return 1;
    if (!value || value <= 0) throw new BadRequestException('value debe ser mayor que 0');
    return value;
  }
  private transactionType(type: AccumulationType) { return type === AccumulationType.VISIT_COUNT ? TransactionType.VISIT : type === AccumulationType.AMOUNT_SPENT ? TransactionType.AMOUNT : type === AccumulationType.POINTS ? TransactionType.MANUAL_POINTS : TransactionType.PURCHASE; }
}
