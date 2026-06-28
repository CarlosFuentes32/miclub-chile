import { Injectable } from "@nestjs/common";
import {
  CycleStatus,
  MembershipStatus,
  ProgramStatus,
  RewardStatus,
  TransactionStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import {
  CreateCollaboratorDto,
  UpdateBusinessDto,
  UpdateCollaboratorDto,
} from "./dto/business.dto";
import { PrismaService } from "../prisma/prisma.service";
import { BusinessAccessService } from "./business-access.service";

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly config: ConfigService,
  ) {}
  mine(userId: string) {
    return this.prisma.businessUser.findMany({
      where: { userId, status: "ACTIVE" },
      select: {
        role: true,
        business: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });
  }
  async settings(userId: string, businessId: string) {
    await this.access.requireManager(userId, businessId);
    return this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
  }
  async updateSettings(
    userId: string,
    businessId: string,
    dto: UpdateBusinessDto,
  ) {
    await this.access.requireManager(userId, businessId);
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        name: dto.name,
        businessType: dto.business_type,
        rutBusiness: dto.rut_business,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        logoUrl: dto.logo_url,
      },
    });
  }
  async customers(userId: string, businessId: string, query = "") {
    await this.access.requireManager(userId, businessId);
    const rows = await this.prisma.customerBusiness.findMany({
      where: {
        businessId,
        customer: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
          ],
        },
      },
      include: { customer: true },
      take: 100,
      orderBy: { joinedAt: "desc" },
    });
    return Promise.all(
      rows.map(async (row) => {
        const [cycle, rewards, last] = await Promise.all([
          this.prisma.cycle.findFirst({
            where: {
              businessId,
              customerUserId: row.customerUserId,
              status: CycleStatus.ACTIVE,
            },
            orderBy: { createdAt: "desc" },
          }),
          this.prisma.reward.count({
            where: {
              businessId,
              customerUserId: row.customerUserId,
              status: RewardStatus.AVAILABLE,
            },
          }),
          this.prisma.transaction.findFirst({
            where: { businessId, customerUserId: row.customerUserId },
            orderBy: { createdAt: "desc" },
          }),
        ]);
        return {
          id: row.customer.id,
          name: row.customer.name,
          phone: row.customer.phone,
          progress: cycle
            ? `${Number(cycle.currentValue)} de ${Number(cycle.targetValue)}`
            : "Sin ciclo",
          rewardsAvailable: rewards,
          lastVisit: last?.createdAt ?? row.joinedAt,
        };
      }),
    );
  }
  async customerDetail(userId: string, businessId: string, customerId: string) {
    await this.access.requireManager(userId, businessId);
    const customer = await this.prisma.user.findUniqueOrThrow({
      where: { id: customerId },
      select: { id: true, name: true, phone: true, email: true },
    });
    const [cycles, rewards, history] = await Promise.all([
      this.prisma.cycle.findMany({
        where: { businessId, customerUserId: customerId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      this.prisma.reward.findMany({
        where: { businessId, customerUserId: customerId },
        orderBy: { generatedAt: "desc" },
      }),
      this.prisma.transaction.findMany({
        where: { businessId, customerUserId: customerId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    return { customer, cycles, rewards, history };
  }
  async rewards(userId: string, businessId: string, status?: string) {
    await this.access.requireManager(userId, businessId);
    const mapped = status
      ? RewardStatus[status.toUpperCase() as keyof typeof RewardStatus]
      : undefined;
    return this.prisma.reward.findMany({
      where: { businessId, status: mapped },
      include: { customer: { select: { name: true } } },
      orderBy: { generatedAt: "desc" },
    });
  }
  async collaborators(userId: string, businessId: string) {
    await this.access.requireManager(userId, businessId);
    return this.prisma.businessUser.findMany({
      where: { businessId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async createCollaborator(
    userId: string,
    businessId: string,
    dto: CreateCollaboratorDto,
  ) {
    await this.access.requireManager(userId, businessId);
    if (dto.role !== UserRole.CASHIER && dto.role !== UserRole.BUSINESS_ADMIN)
      throw new Error("Rol de colaborador inválido");
    const temporaryPassword = dto.password ?? randomBytes(12).toString("base64url");
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: `+569${Date.now().toString().slice(-8)}`,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        role: dto.role,
        status: UserStatus.ACTIVE,
      },
    });
    const member = await this.prisma.businessUser.create({
      data: { businessId, userId: user.id, role: dto.role },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    return { ...member, temporary_password: temporaryPassword };
  }
  async updateCollaborator(
    userId: string,
    businessId: string,
    membershipId: string,
    dto: UpdateCollaboratorDto,
  ) {
    await this.access.requireManager(userId, businessId);
    return this.prisma.businessUser.update({
      where: { id: membershipId },
      data: {
        role: dto.role,
        status: dto.status as MembershipStatus | undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }
  async qrMaterial(userId: string, businessId: string) {
    const { business } = await this.access.requireManager(userId, businessId);
    return {
      businessCode: business.slug.toUpperCase(),
      registrationUrl: `${this.config.get('CUSTOMER_APP_URL','http://localhost:5173')}/#/register?business=${business.slug}`,
      businessName: business.name,
    };
  }
  async dashboard(userId: string, businessId: string) {
    await this.access.requireManager(userId, businessId);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [
      customers,
      transactions,
      generated,
      redeemed,
      newCustomers,
      program,
    ] = await Promise.all([
      this.prisma.customerBusiness.count({ where: { businessId } }),
      this.prisma.transaction.count({
        where: {
          businessId,
          status: TransactionStatus.VALID,
          createdAt: { gte: start },
        },
      }),
      this.prisma.reward.count({
        where: { businessId, generatedAt: { gte: start } },
      }),
      this.prisma.reward.count({
        where: {
          businessId,
          status: RewardStatus.REDEEMED,
          redeemedAt: { gte: start },
        },
      }),
      this.prisma.customerBusiness.count({
        where: { businessId, joinedAt: { gte: start } },
      }),
      this.prisma.loyaltyProgram.findFirst({
        where: { businessId, status: ProgramStatus.ACTIVE },
        orderBy: { version: "desc" },
      }),
    ]);
    return {
      customers_registered: customers,
      transactions_registered: transactions,
      rewards_generated: generated,
      rewards_redeemed: redeemed,
      new_customers: newCustomers,
      active_program: program
        ? {
            id: program.id,
            name: program.name,
            accumulation_type: program.accumulationType.toLowerCase(),
            target_value: Number(program.targetValue),
            reward_description: program.rewardDescription,
            version: program.version,
          }
        : null,
    };
  }
}
