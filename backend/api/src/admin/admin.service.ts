import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BusinessStatus,
  MembershipStatus,
  Prisma,
  RewardStatus,
  TransactionStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { publicUserSelect } from "../users/users.service";
import {
  CreateBusinessDto,
  PlanDto,
  UpdateAdminUserDto,
} from "./dto/admin.dto";
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  async dashboard() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const activeBusinesses = await this.prisma.business.findMany({
      where: { status: BusinessStatus.ACTIVE },
      include: { plan: true },
    });
    const [users, transactions, generated, redeemed, risk] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.transaction.count({
        where: { status: TransactionStatus.VALID, createdAt: { gte: start } },
      }),
      this.prisma.reward.count({ where: { generatedAt: { gte: start } } }),
      this.prisma.reward.count({
        where: { status: RewardStatus.REDEEMED, redeemedAt: { gte: start } },
      }),
      this.prisma.business.count({
        where: {
          status: {
            in: [BusinessStatus.SUSPENDED, BusinessStatus.GRACE_PERIOD],
          },
        },
      }),
    ]);
    return {
      activeBusinesses: activeBusinesses.length,
      registeredUsers: users,
      todayTransactions: transactions,
      rewardsGenerated: generated,
      rewardsRedeemed: redeemed,
      atRiskBusinesses: risk,
      estimatedMonthlyRevenue: activeBusinesses.reduce(
        (s, b) => s + Number(b.plan?.monthlyPrice ?? 0),
        0,
      ),
    };
  }
  async businesses() {
    const rows = await this.prisma.business.findMany({
      include: {
        owner: { select: { name: true } },
        plan: true,
        _count: {
          select: { customers: true, transactions: true, rewards: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(
      rows.map(async (b) => {
        const last = await this.prisma.transaction.findFirst({
          where: { businessId: b.id },
          orderBy: { createdAt: "desc" },
        });
        const days = last
          ? (Date.now() - last.createdAt.getTime()) / 86400000
          : 999;
        return {
          id: b.id,
          name: b.name,
          category: b.businessType,
          rut: b.rutBusiness,
          owner: b.owner.name,
          phone: b.phone,
          email: b.email,
          plan: b.plan?.name ?? "Sin plan",
          status: b.status.toLowerCase(),
          customers: b._count.customers,
          transactions: b._count.transactions,
          rewards: b._count.rewards,
          lastUse: last?.createdAt ?? null,
          usage: days <= 3 ? "frequent" : days <= 14 ? "low" : "inactive",
          activeProgram:
            (
              await this.prisma.loyaltyProgram.findFirst({
                where: { businessId: b.id, status: "ACTIVE" },
              })
            )?.name ?? "Sin programa",
        };
      }),
    );
  }
  async createBusiness(d: CreateBusinessDto) {
    const email = d.ownerEmail.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException(
        "Ya existe un usuario con el correo del dueño",
      );
    let slug = d.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!slug) slug = `comercio-${Date.now()}`;
    if (await this.prisma.business.findUnique({ where: { slug } }))
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    const result = await this.prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          name: d.ownerName,
          email,
          phone: d.ownerPhone,
          passwordHash: await bcrypt.hash(d.ownerPassword, 12),
          role: UserRole.BUSINESS_OWNER,
          status: UserStatus.ACTIVE,
        },
      });
      const business = await tx.business.create({
        data: {
          name: d.name,
          slug,
          businessType: d.businessType,
          rutBusiness: d.rutBusiness || null,
          address: d.address,
          region: d.region,
          commune: d.commune,
          phone: d.phone,
          email: d.email.toLowerCase(),
          planId: d.planId,
          ownerUserId: owner.id,
          status: BusinessStatus.ACTIVE,
        },
      });
      await tx.businessUser.create({
        data: {
          businessId: business.id,
          userId: owner.id,
          role: UserRole.BUSINESS_OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });
      return {
        business,
        owner: {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          role: owner.role,
        },
      };
    });
    return result;
  }
  async business(id: string) {
    const all = await this.businesses();
    return all.find((b) => b.id === id) ?? null;
  }
  async businessStatus(id: string, status: string) {
    const value =
      BusinessStatus[status.toUpperCase() as keyof typeof BusinessStatus];
    if (!value) throw new NotFoundException("Estado inválido");
    return this.prisma.business.update({
      where: { id },
      data: { status: value },
    });
  }
  async deleteBusiness(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: { id },
        data: { status: BusinessStatus.CANCELLED },
      });
      await tx.businessUser.updateMany({
        where: { businessId: id },
        data: { status: MembershipStatus.INACTIVE },
      });
      return business;
    });
  }
  async users(status?: string) {
    const normalized =
      status && status !== "all"
        ? UserStatus[status.toUpperCase() as keyof typeof UserStatus]
        : undefined;
    if (status && status !== "all" && !normalized)
      throw new NotFoundException("Estado inválido");
    return this.prisma.user.findMany({
      where: normalized ? { status: normalized } : undefined,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        rut: true,
        forcePasswordChange: true,
        lockedAt: true,
        deletedAt: true,
        deletedBy: { select: { id: true, name: true, email: true } },
        createdAt: true,
        businessMemberships: {
          select: { business: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async user(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        rut: true,
        forcePasswordChange: true,
        lockedAt: true,
        deletedAt: true,
        deletedBy: { select: { id: true, name: true, email: true } },
        createdAt: true,
        businessMemberships: {
          select: { business: { select: { name: true } } },
        },
      },
    });
  }
  async userStatus(id: string, status: string, actorId: string) {
    const value = UserStatus[status.toUpperCase() as keyof typeof UserStatus];
    if (!value) throw new NotFoundException("Estado inválido");
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    if (current.status === UserStatus.DELETED)
      throw new ConflictException(
        "Use la acción Reactivar usuario para recuperar una cuenta eliminada.",
      );
    const action =
      value === UserStatus.SUSPENDED ? "user_suspended" : "user_status_changed";
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data:
          value === UserStatus.ACTIVE
            ? this.activeUserState()
            : { status: value },
      });
      await tx.userChange.create({
        data: {
          userId: id,
          actorId,
          field: "status",
          oldValue: current.status,
          newValue: value,
          action,
        },
      });
      await this.audit.create(
        {
          userId: actorId,
          action,
          entityType: "user",
          entityId: id,
          metadata: { status: value },
        },
        tx,
      );
      return user;
    });
  }
  async updateUser(id: string, dto: UpdateAdminUserDto, actorId: string) {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { name: true, email: true, phone: true, role: true },
    });
    const next = { ...dto, email: dto.email?.toLowerCase() };
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: next,
        select: publicUserSelect,
      });
      for (const field of ["name", "email", "phone"] as const) {
        const value = next[field];
        if (value !== undefined && value !== current[field]) {
          await tx.userChange.create({
            data: {
              userId: id,
              actorId,
              field,
              oldValue: current[field],
              newValue: value,
              action: `${field}_changed`,
            },
          });
          await this.audit.create(
            {
              userId: actorId,
              action: `${field}_changed`,
              entityType: "user",
              entityId: id,
              metadata: { oldValue: current[field], newValue: value },
            },
            tx,
          );
        }
      }
      return updated;
    });
  }
  async changePassword(id: string, password: string, actorId: string) {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    await this.prisma.authSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.create({
      userId: actorId,
      action: "admin_password_reset",
      entityType: "user",
      entityId: id,
    });
    return { ok: true };
  }
  async supportUsers(role: string) {
    const roles: Record<string, UserRole[]> = {
      clientes: [UserRole.CUSTOMER],
      comercios: [UserRole.BUSINESS_OWNER, UserRole.BUSINESS_ADMIN],
      cajeros: [UserRole.CASHIER],
      administradores: [UserRole.MICLUB_ADMIN],
    };
    const selected = roles[role];
    if (!selected) throw new NotFoundException("Tipo de usuario inválido");
    return this.prisma.user.findMany({
      where: { role: { in: selected } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rut: true,
        role: true,
        status: true,
        forcePasswordChange: true,
        lockedAt: true,
        birthDate: true,
        businessMemberships: {
          select: { business: { select: { name: true, rutBusiness: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
  }
  async resetPassword(id: string, actorId: string) {
    const temporaryPassword = `MC-${randomBytes(9).toString("base64url")}!`;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          passwordHash: await bcrypt.hash(temporaryPassword, 12),
          forcePasswordChange: true,
          failedLoginAttempts: 0,
          lockedAt: null,
        },
      });
      await tx.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.userChange.create({
        data: {
          userId: id,
          actorId,
          field: "password",
          action: "password_reset",
        },
      });
      await this.audit.create(
        {
          userId: actorId,
          action: "password_reset",
          entityType: "user",
          entityId: id,
        },
        tx,
      );
    });
    return { temporaryPassword, shownOnce: true, forcePasswordChange: true };
  }
  async unlockUser(id: string, actorId: string) {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    if (current.status === UserStatus.DELETED)
      throw new ConflictException(
        "Una cuenta eliminada debe reactivarse desde Usuarios Eliminados.",
      );
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          lockedAt: null,
          failedLoginAttempts: 0,
          status: UserStatus.ACTIVE,
        },
      });
      await tx.userChange.create({
        data: {
          userId: id,
          actorId,
          field: "account",
          action: "account_unlocked",
        },
      });
      await this.audit.create(
        {
          userId: actorId,
          action: "account_unlocked",
          entityType: "user",
          entityId: id,
        },
        tx,
      );
    });
    return { ok: true };
  }
  async correctRut(
    id: string,
    rut: string,
    confirmed: boolean,
    actorId: string,
  ) {
    if (!confirmed)
      throw new ConflictException("Debes confirmar la corrección del RUT.");
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { rut: true },
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { rut },
        select: publicUserSelect,
      });
      await tx.userChange.create({
        data: {
          userId: id,
          actorId,
          field: "rut",
          oldValue: current.rut,
          newValue: rut,
          action: "rut_corrected",
        },
      });
      await this.audit.create(
        {
          userId: actorId,
          action: "rut_corrected",
          entityType: "user",
          entityId: id,
          metadata: { old_rut: current.rut, new_rut: rut },
        },
        tx,
      );
      return user;
    });
    return updated;
  }
  userHistory(id: string) {
    return this.prisma.userChange.findMany({
      where: { userId: id },
      select: {
        id: true,
        field: true,
        action: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async deleteUser(id: string, actorId: string) {
    if (id === actorId)
      throw new ConflictException(
        "No puedes eliminar tu propia cuenta administrativa.",
      );
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: UserStatus.DELETED,
          deletedAt: new Date(),
          deletedByUserId: actorId,
          lockedAt: null,
          failedLoginAttempts: 0,
        },
      });
      await tx.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.userChange.create({
        data: {
          userId: id,
          actorId,
          field: "status",
          oldValue: current.status,
          newValue: "DELETED",
          action: "user_deleted",
        },
      });
      await this.audit.create(
        {
          userId: actorId,
          action: "user_deleted",
          entityType: "user",
          entityId: id,
        },
        tx,
      );
    });
    return { ok: true };
  }
  async reactivateUser(id: string, actorId: string) {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (
      current.status !== UserStatus.DELETED &&
      current.status !== UserStatus.SUSPENDED
    )
      throw new ConflictException("La cuenta no está eliminada ni suspendida.");
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: this.activeUserState(),
        select: publicUserSelect,
      });
      await tx.userChange.create({
        data: {
          userId: id,
          actorId,
          field: "status",
          oldValue: current.status,
          newValue: "ACTIVE",
          action: "user_reactivated",
        },
      });
      await this.audit.create(
        {
          userId: actorId,
          action: "user_reactivated",
          entityType: "user",
          entityId: id,
        },
        tx,
      );
      return user;
    });
  }
  private activeUserState() {
    return {
      status: UserStatus.ACTIVE,
      deletedAt: null,
      deletedByUserId: null,
      lockedAt: null,
      failedLoginAttempts: 0,
    } as const;
  }
  async plans() {
    const rows = await this.prisma.plan.findMany({
      orderBy: { monthlyPrice: "asc" },
    });
    return rows.map((p) => ({ ...p, monthlyPrice: Number(p.monthlyPrice) }));
  }
  async createPlan(d: PlanDto) {
    const p = await this.prisma.plan.create({
      data: {
        ...d,
        monthlyPrice: new Prisma.Decimal(d.monthlyPrice),
        active: d.active ?? true,
      },
    });
    return { ...p, monthlyPrice: Number(p.monthlyPrice) };
  }
  async updatePlan(id: string, d: PlanDto) {
    const p = await this.prisma.plan.update({
      where: { id },
      data: { ...d, monthlyPrice: new Prisma.Decimal(d.monthlyPrice) },
    });
    return { ...p, monthlyPrice: Number(p.monthlyPrice) };
  }
  async reports() {
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    const [
      newBusinesses,
      newUsers,
      monthlyTransactions,
      rewardsGenerated,
      rewardsRedeemed,
      activeBusinesses,
      suspendedBusinesses,
    ] = await Promise.all([
      this.prisma.business.count({ where: { createdAt: { gte: month } } }),
      this.prisma.user.count({ where: { createdAt: { gte: month } } }),
      this.prisma.transaction.count({
        where: { createdAt: { gte: month }, status: TransactionStatus.VALID },
      }),
      this.prisma.reward.count({ where: { generatedAt: { gte: month } } }),
      this.prisma.reward.count({
        where: { redeemedAt: { gte: month }, status: RewardStatus.REDEEMED },
      }),
      this.prisma.business.count({ where: { status: BusinessStatus.ACTIVE } }),
      this.prisma.business.count({
        where: { status: BusinessStatus.SUSPENDED },
      }),
    ]);
    return {
      newBusinesses,
      newUsers,
      monthlyTransactions,
      rewardsGenerated,
      rewardsRedeemed,
      activeBusinesses,
      suspendedBusinesses,
    };
  }
}
