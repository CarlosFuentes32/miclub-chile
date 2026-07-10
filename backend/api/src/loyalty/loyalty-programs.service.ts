import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProgramStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BusinessAccessService } from '../businesses/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoyaltyProgramDto, UpdateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';

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

  async list(userId: string, businessId: string) {
    await this.access.requireManager(userId, businessId);
    return this.prisma.loyaltyProgram.findMany({
      where: { businessId },
      orderBy: [{ status: 'asc' }, { version: 'desc' }],
    });
  }

  async update(userId: string, programId: string, dto: UpdateLoyaltyProgramDto) {
    await this.access.requireManager(userId, dto.business_id);
    const program = await this.prisma.loyaltyProgram.findUnique({ where: { id: programId } });
    if (!program || program.businessId !== dto.business_id) throw new NotFoundException('Programa no encontrado en este comercio');
    if (program.status === ProgramStatus.ARCHIVED) throw new BadRequestException('No se puede editar un programa archivado');
    const updated = await this.prisma.loyaltyProgram.update({
      where: { id: programId },
      data: {
        name: dto.name,
        accumulationType: dto.accumulation_type,
        targetValue: dto.target_value !== undefined ? new Prisma.Decimal(dto.target_value) : undefined,
        rewardDescription: dto.reward_description,
        rewardExpirationDays: dto.reward_expiration_days,
      },
    });
    await this.audit.create({ userId, businessId: dto.business_id, action: 'loyalty_program_updated', entityType: 'loyalty_program', entityId: updated.id, metadata: { version: updated.version } });
    return updated;
  }

  async activate(userId: string, programId: string, businessId: string) {
    await this.access.requireManager(userId, businessId);
    return this.prisma.$transaction(async tx => {
      const program = await tx.loyaltyProgram.findUnique({ where: { id: programId } });
      if (!program || program.businessId !== businessId) throw new NotFoundException('Programa no encontrado en este comercio');
      await tx.loyaltyProgram.updateMany({ where: { businessId, status: ProgramStatus.ACTIVE }, data: { status: ProgramStatus.ARCHIVED } });
      const active = await tx.loyaltyProgram.update({ where: { id: programId }, data: { status: ProgramStatus.ACTIVE } });
      await this.audit.create({ userId, businessId, action: 'loyalty_program_activated', entityType: 'loyalty_program', entityId: active.id, metadata: { version: active.version } }, tx);
      return active;
    });
  }

  async archive(userId: string, programId: string, businessId: string) {
    await this.access.requireManager(userId, businessId);
    const program = await this.prisma.loyaltyProgram.findUnique({ where: { id: programId } });
    if (!program || program.businessId !== businessId) throw new NotFoundException('Programa no encontrado en este comercio');
    const archived = await this.prisma.loyaltyProgram.update({ where: { id: programId }, data: { status: ProgramStatus.ARCHIVED } });
    await this.audit.create({ userId, businessId, action: 'loyalty_program_archived', entityType: 'loyalty_program', entityId: archived.id, metadata: { version: archived.version } });
    return archived;
  }
}
