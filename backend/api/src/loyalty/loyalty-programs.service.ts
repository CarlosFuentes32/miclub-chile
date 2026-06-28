import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProgramStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BusinessAccessService } from '../businesses/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';

@Injectable()
export class LoyaltyProgramsService {
  constructor(private readonly prisma: PrismaService, private readonly access: BusinessAccessService, private readonly audit: AuditService) {}

  async create(userId: string, dto: CreateLoyaltyProgramDto) {
    await this.access.requireManager(userId, dto.business_id);
    return this.prisma.$transaction(async tx => {
      const latest = await tx.loyaltyProgram.findFirst({ where: { businessId: dto.business_id }, orderBy: { version: 'desc' } });
      await tx.loyaltyProgram.updateMany({ where: { businessId: dto.business_id, status: ProgramStatus.ACTIVE }, data: { status: ProgramStatus.ARCHIVED } });
      const program = await tx.loyaltyProgram.create({ data: { businessId: dto.business_id, name: dto.name, accumulationType: dto.accumulation_type, targetValue: new Prisma.Decimal(dto.target_value), rewardDescription: dto.reward_description, rewardExpirationDays: dto.reward_expiration_days, version: (latest?.version ?? 0) + 1, status: ProgramStatus.ACTIVE } });
      await this.audit.create({ userId, businessId: dto.business_id, action: 'loyalty_program_created', entityType: 'loyalty_program', entityId: program.id, metadata: { version: program.version } }, tx);
      return program;
    });
  }

  async active(userId: string, businessId: string) {
    await this.access.requireManager(userId, businessId);
    const program = await this.prisma.loyaltyProgram.findFirst({ where: { businessId, status: ProgramStatus.ACTIVE }, orderBy: { version: 'desc' } });
    if (!program) throw new NotFoundException('El comercio no tiene un programa activo');
    return program;
  }
}
