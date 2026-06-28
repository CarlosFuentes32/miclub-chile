import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditInput { userId: string; businessId?: string; action: string; entityType: string; entityId: string; metadata?: Prisma.InputJsonValue; }

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  create(input: AuditInput, client: Prisma.TransactionClient = this.prisma) { return client.auditLog.create({ data: input }); }
}
