import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CycleStatus, ProgramStatus, RewardStatus, UserRole, UserStatus } from '@prisma/client';
import { BusinessAccessService } from '../businesses/business-access.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashierService {
  constructor(private readonly prisma: PrismaService, private readonly access: BusinessAccessService, private readonly jwt: JwtService) {}

  async scan(userId: string, businessId: string, token: string) {
    await this.access.requireMember(userId, businessId);
    let payload: { sub: string; type: string };
    try { payload = await this.jwt.verifyAsync(token); } catch { throw new UnauthorizedException('QR inválido o vencido'); }
    if (payload.type !== 'customer_qr') throw new UnauthorizedException('QR de cliente inválido');
    return this.snapshot(payload.sub, businessId);
  }

  async search(userId: string, businessId: string, phone: string) {
    await this.access.requireMember(userId, businessId);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 3) return [];
    const normalized = digits.length === 8 ? `+569${digits}` : digits;
    const users = await this.prisma.user.findMany({ where: { role: UserRole.CUSTOMER, status: UserStatus.ACTIVE, phone: { contains: normalized } }, select: { id: true, name: true, phone: true, email: true }, take: 10 });
    return Promise.all(users.map(user => this.snapshot(user.id, businessId)));
  }

  async snapshot(customerId: string, businessId: string) {
    await this.expireRewards(customerId, businessId);
    const [customer, program, cycle, rewards, lastTransaction] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: customerId }, select: { id: true, name: true, phone: true, email: true, status: true } }),
      this.prisma.loyaltyProgram.findFirst({ where: { businessId, status: ProgramStatus.ACTIVE }, orderBy: { version: 'desc' }, include: { business: { select: { name: true } } } }),
      this.prisma.cycle.findFirst({ where: { customerUserId: customerId, businessId, status: CycleStatus.ACTIVE }, orderBy: { createdAt: 'desc' } }),
      this.prisma.reward.findMany({ where: { customerUserId: customerId, businessId, status: RewardStatus.AVAILABLE }, orderBy: { generatedAt: 'desc' } }),
      this.prisma.transaction.findFirst({ where: { customerUserId: customerId, businessId }, orderBy: { createdAt: 'desc' } }),
    ]);
    if (!customer || customer.status !== UserStatus.ACTIVE) throw new NotFoundException('Cliente no encontrado');
    if (!program) throw new NotFoundException('El comercio no tiene programa activo');
    return { customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }, business: { id: businessId, name: program.business.name }, cycle: cycle ? { id: cycle.id, current_value: Number(cycle.currentValue), target_value: Number(cycle.targetValue) } : null, progress: { current: cycle ? Number(cycle.currentValue) : 0, target: Number(program.targetValue) }, rewards_available: rewards.map(r => ({ id: r.id, description: r.rewardDescription, expires_at: r.expiresAt })), next_reward: program.rewardDescription, last_transaction: lastTransaction ? { id: lastTransaction.id, created_at: lastTransaction.createdAt, status: lastTransaction.status } : null };
  }

  private expireRewards(customerId: string, businessId: string) { return this.prisma.reward.updateMany({ where: { customerUserId: customerId, businessId, status: RewardStatus.AVAILABLE, expiresAt: { lte: new Date() } }, data: { status: RewardStatus.EXPIRED } }); }
}
