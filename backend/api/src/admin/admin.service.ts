import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BusinessStatus,
  BillingPeriod,
  CycleStatus,
  MembershipStatus,
  PaymentProvider,
  PaymentStatus,
  PlanStatus,
  ProgramStatus,
  Prisma,
  RewardStatus,
  SubscriptionStatus,
  TransactionStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";
import { publicUserSelect } from "../users/users.service";
import {
  CreateBusinessDto,
  ManualPaymentDto,
  ManualAdjustmentDto,
  ManualRewardDto,
  PlanDto,
  UpdateAdminUserDto,
  UpdateBusinessDto,
} from "./dto/admin.dto";
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
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
  async superDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(Date.now() - 7 * 86_400_000);
    const [
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      deletedBusinesses,
      totalCustomers,
      totalCashiers,
      totalAdmins,
      activePrograms,
      totalPurchases,
      totalRedeems,
      rewardsDelivered,
      activityToday,
      activityWeek,
      topBusinesses,
      topCustomers,
    ] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.business.count({ where: { status: BusinessStatus.ACTIVE } }),
      this.prisma.business.count({
        where: { status: BusinessStatus.SUSPENDED },
      }),
      this.prisma.business.count({ where: { status: BusinessStatus.DELETED } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: UserRole.CASHIER } }),
      this.prisma.user.count({
        where: { role: { in: [UserRole.MICLUB_ADMIN, UserRole.SUPER_ADMIN] } },
      }),
      this.prisma.loyaltyProgram.count({
        where: { status: ProgramStatus.ACTIVE },
      }),
      this.prisma.transaction.count({
        where: { status: TransactionStatus.VALID },
      }),
      this.prisma.reward.count({ where: { status: RewardStatus.REDEEMED } }),
      this.prisma.reward.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: today } } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: week } } }),
      this.prisma.business.findMany({
        take: 5,
        include: {
          _count: {
            select: { transactions: true, rewards: true, customers: true },
          },
        },
        orderBy: { transactions: { _count: "desc" } },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.CUSTOMER },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          _count: { select: { customerTransactions: true, rewards: true } },
        },
        orderBy: { customerTransactions: { _count: "desc" } },
      }),
    ]);
    return {
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      deletedBusinesses,
      totalCustomers,
      totalCashiers,
      totalAdmins,
      activePrograms,
      totalPurchases,
      totalRedeems,
      rewardsDelivered,
      activityToday,
      activityWeek,
      topBusinesses: topBusinesses.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status.toLowerCase(),
        transactions: b._count.transactions,
        rewards: b._count.rewards,
        customers: b._count.customers,
      })),
      topCustomers: topCustomers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        transactions: u._count.customerTransactions,
        rewards: u._count.rewards,
      })),
    };
  }

  async createBusiness(d: CreateBusinessDto, actorId?: string) {
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
      const plan = await tx.plan.findUniqueOrThrow({ where: { id: d.planId } });
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
      const start = new Date();
      const trialEndsAt = plan.trialDays > 0 ? this.addDays(start, plan.trialDays) : null;
      const firstBilling = trialEndsAt ?? this.addPeriod(start, plan.billingPeriod);
      await tx.businessSubscription.create({
        data: {
          businessId: business.id,
          planId: plan.id,
          status: trialEndsAt ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
          startedAt: start,
          trialEndsAt,
          currentPeriodStartsAt: start,
          currentPeriodEndsAt: firstBilling,
          nextBillingAt: firstBilling,
          lastPaymentStatus: plan.monthlyPrice.equals(0) ? PaymentStatus.APPROVED : null,
          metadata: { source: "admin_create_business" },
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
    if (actorId)
      await this.audit.create({
        userId: actorId,
        businessId: result.business.id,
        action: "business_created",
        entityType: "business",
        entityId: result.business.id,
        metadata: { owner_email: email },
      });
    void this.email.collaboratorInvited(result.owner.email, result.owner.name, result.business.name, "BUSINESS_OWNER");
    if (process.env.ADMIN_ALERT_EMAIL)
      void this.email.adminNotice(
        process.env.ADMIN_ALERT_EMAIL,
        "Equipo MiClub",
        "Nuevo comercio creado",
        "Se creó un comercio desde el Panel Administrador.",
        [
          { label: "Comercio", value: result.business.name },
          { label: "Dueño", value: result.owner.email },
        ],
      );
    return result;
  }
  async business(id: string) {
    const all = await this.businesses();
    return all.find((b) => b.id === id) ?? null;
  }
  async updateBusiness(id: string, d: UpdateBusinessDto, actorId?: string) {
    const current = await this.prisma.business.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Comercio no encontrado");
    const data: Prisma.BusinessUpdateInput = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.businessType !== undefined) data.businessType = d.businessType;
    if (d.rutBusiness !== undefined)
      data.rutBusiness = d.rutBusiness.trim() || null;
    if (d.address !== undefined) data.address = d.address;
    if (d.region !== undefined) data.region = d.region;
    if (d.commune !== undefined) data.commune = d.commune;
    if (d.phone !== undefined) data.phone = d.phone;
    if (d.email !== undefined) data.email = d.email.toLowerCase();
    if (d.planId !== undefined) data.plan = { connect: { id: d.planId } };
    const updated = await this.prisma.business.update({
      where: { id },
      data,
    });
    if (actorId)
      await this.audit.create({
        userId: actorId,
        businessId: id,
        action: "business_updated",
        entityType: "business",
        entityId: id,
        metadata: {
          fields: Object.keys(d),
          previous: {
            name: current.name,
            businessType: current.businessType,
            rutBusiness: current.rutBusiness,
            phone: current.phone,
            email: current.email,
            planId: current.planId,
          },
        },
      });
    return updated;
  }
  async businessStatus(id: string, status: string, actorId?: string) {
    const value =
      BusinessStatus[status.toUpperCase() as keyof typeof BusinessStatus];
    if (!value) throw new NotFoundException("Estado inválido");
    const updated = await this.prisma.business.update({
      where: { id },
      include: { owner: { select: { email: true, name: true } } },
      data: { status: value },
    });
    if (actorId)
      await this.audit.create({
        userId: actorId,
        businessId: id,
        action: "business_status_changed",
        entityType: "business",
        entityId: id,
        metadata: { status: value },
      });
    void this.email.businessStatus(updated.owner.email, updated.owner.name, updated.name, value);
    if (process.env.ADMIN_ALERT_EMAIL)
      void this.email.adminNotice(
        process.env.ADMIN_ALERT_EMAIL,
        "Equipo MiClub",
        "Estado de comercio actualizado",
        "Se actualizó el estado administrativo de un comercio.",
        [
          { label: "Comercio", value: updated.name },
          { label: "Estado", value },
        ],
      );
    return updated;
  }
  async deleteBusiness(id: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: { id },
        data: { status: BusinessStatus.DELETED },
      });
      await tx.businessUser.updateMany({
        where: { businessId: id },
        data: { status: MembershipStatus.INACTIVE },
      });
      if (actorId)
        await this.audit.create(
          {
            userId: actorId,
            businessId: id,
            action: "business_deleted",
            entityType: "business",
            entityId: id,
          },
          tx,
        );
      return business;
    });
  }
  async restoreBusiness(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: { id },
        data: { status: BusinessStatus.ACTIVE },
      });
      await tx.businessUser.updateMany({
        where: { businessId: id },
        data: { status: MembershipStatus.ACTIVE },
      });
      await this.audit.create(
        {
          userId: actorId,
          businessId: id,
          action: "business_restored",
          entityType: "business",
          entityId: id,
        },
        tx,
      );
      return business;
    });
  }
  async businessFull(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: { select: publicUserSelect },
        plan: true,
        users: { include: { user: { select: publicUserSelect } } },
        programs: { orderBy: { createdAt: "desc" } },
        rewards: {
          orderBy: { generatedAt: "desc" },
          take: 50,
          include: {
            customer: { select: { name: true, email: true, phone: true } },
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            customer: { select: { name: true, email: true, phone: true } },
            performedBy: { select: { name: true, email: true } },
          },
        },
        planHistory: { orderBy: { createdAt: "desc" }, take: 30 },
        _count: {
          select: {
            customers: true,
            transactions: true,
            rewards: true,
            programs: true,
          },
        },
      },
    });
    if (!business) throw new NotFoundException("Comercio no encontrado");
    return business;
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
    const user = await this.prisma.$transaction(async (tx) => {
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
    if (value === UserStatus.SUSPENDED) void this.email.accountStatus(user.email, user.name, "suspended");
    if (value === UserStatus.ACTIVE) void this.email.accountStatus(user.email, user.name, "reactivated");
    return user;
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
    const user = await this.prisma.user.update({
      where: { id },
      select: { email: true, name: true },
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
    void this.email.passwordChanged(user.email, user.name);
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
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: { email: true, name: true } });
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
    void this.email.passwordChanged(user.email, user.name);
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
    const current = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        deletedByUserId: true,
      },
    });
    if (!current) throw new NotFoundException("Usuario no encontrado.");
    if (
      current.status !== UserStatus.DELETED &&
      current.status !== UserStatus.SUSPENDED
    )
      throw new ConflictException("La cuenta no está eliminada ni suspendida.");
    const user = await this.prisma.$transaction(async (tx) => {
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
          metadata: {
            previous_status: current.status,
            new_status: UserStatus.ACTIVE,
            previous_deleted_at: current.deletedAt,
            previous_deleted_by_user_id: current.deletedByUserId,
          },
        },
        tx,
      );
      return user;
    });
    void this.email.accountStatus(user.email, user.name, "reactivated");
    return user;
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
    return rows.map((p) => this.planDto(p));
  }
  async createPlan(d: PlanDto) {
    const p = await this.prisma.plan.create({
      data: {
        name: d.name,
        currency: d.currency ?? "CLP",
        billingPeriod: d.billingPeriod ?? BillingPeriod.MONTHLY,
        trialDays: d.trialDays ?? 0,
        customerLimit: d.customerLimit,
        collaboratorLimit: d.collaboratorLimit,
        features: d.features,
        monthlyPrice: new Prisma.Decimal(d.monthlyPrice),
        active: d.active ?? true,
        status: d.active === false ? PlanStatus.INACTIVE : PlanStatus.ACTIVE,
      },
    });
    return this.planDto(p);
  }
  async updatePlan(id: string, d: PlanDto) {
    const p = await this.prisma.plan.update({
      where: { id },
      data: {
        name: d.name,
        currency: d.currency ?? "CLP",
        billingPeriod: d.billingPeriod ?? BillingPeriod.MONTHLY,
        trialDays: d.trialDays ?? 0,
        customerLimit: d.customerLimit,
        collaboratorLimit: d.collaboratorLimit,
        features: d.features,
        monthlyPrice: new Prisma.Decimal(d.monthlyPrice),
        active: d.active ?? true,
        status: d.active === false ? PlanStatus.INACTIVE : PlanStatus.ACTIVE,
      },
    });
    return this.planDto(p);
  }

  async billingSubscriptions(status?: string) {
    const normalized = this.subscriptionStatus(status);
    const rows = await this.prisma.businessSubscription.findMany({
      where: normalized ? { status: normalized } : undefined,
      include: { business: { select: { id: true, name: true, status: true } }, plan: true, payments: { orderBy: { createdAt: "desc" }, take: 5 } },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((s) => ({
      ...s,
      plan: this.planDto(s.plan),
      payments: s.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    }));
  }

  async billingPayments(status?: string) {
    const normalized = this.paymentStatus(status);
    const rows = await this.prisma.billingPayment.findMany({
      where: normalized ? { status: normalized } : undefined,
      include: { business: { select: { id: true, name: true } }, subscription: { include: { plan: true } }, history: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return rows.map((p) => ({ ...p, amount: Number(p.amount) }));
  }

  async registerManualPayment(dto: ManualPaymentDto, actorId: string) {
    const idempotencyKey = dto.idempotencyKey ?? `manual:${dto.businessId}:${dto.reference}`;
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.billingPayment.findUnique({ where: { idempotencyKey } });
      if (existing) return { ...existing, amount: Number(existing.amount), idempotent: true };
      const business = await tx.business.findUniqueOrThrow({ where: { id: dto.businessId } });
      const plan = await tx.plan.findUniqueOrThrow({ where: { id: dto.planId } });
      const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
      const periodStart = paidAt;
      const periodEnd = this.addPeriod(periodStart, plan.billingPeriod);
      const subscription = await tx.businessSubscription.upsert({
        where: { businessId: business.id },
        update: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStartsAt: periodStart,
          currentPeriodEndsAt: periodEnd,
          nextBillingAt: periodEnd,
          graceEndsAt: null,
          cancelledAt: null,
          cancellationReason: null,
          externalProvider: PaymentProvider.MANUAL,
          lastPaymentStatus: PaymentStatus.APPROVED,
        },
        create: {
          businessId: business.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startedAt: paidAt,
          currentPeriodStartsAt: periodStart,
          currentPeriodEndsAt: periodEnd,
          nextBillingAt: periodEnd,
          externalProvider: PaymentProvider.MANUAL,
          lastPaymentStatus: PaymentStatus.APPROVED,
        },
      });
      await tx.business.update({ where: { id: business.id }, data: { planId: plan.id, status: BusinessStatus.ACTIVE } });
      const payment = await tx.billingPayment.create({
        data: {
          businessId: business.id,
          subscriptionId: subscription.id,
          provider: PaymentProvider.MANUAL,
          amount: new Prisma.Decimal(dto.amount),
          currency: dto.currency ?? plan.currency ?? "CLP",
          status: PaymentStatus.APPROVED,
          paidAt,
          periodStart,
          periodEnd,
          paymentMethod: dto.paymentMethod ?? "transferencia",
          reference: dto.reference,
          idempotencyKey,
          providerPayload: { reason: dto.reason, actorId },
        },
      });
      await tx.billingPaymentHistory.create({ data: { paymentId: payment.id, newStatus: PaymentStatus.APPROVED, reason: dto.reason, metadata: { actorId, manual: true } } });
      await this.audit.create({ userId: actorId, businessId: business.id, action: "manual_payment_registered", entityType: "billing_payment", entityId: payment.id, metadata: { amount: dto.amount, reference: dto.reference, periodEnd } }, tx);
      return { ...payment, amount: Number(payment.amount) };
    });
  }

  async changeSubscriptionPlan(businessId: string, planId: string, reason: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.business.findUniqueOrThrow({ where: { id: businessId }, select: { planId: true } });
      const plan = await tx.plan.findUniqueOrThrow({ where: { id: planId } });
      const subscription = await tx.businessSubscription.upsert({
        where: { businessId },
        update: { planId: plan.id },
        create: { businessId, planId: plan.id, status: SubscriptionStatus.TRIALING, trialEndsAt: plan.trialDays ? this.addDays(new Date(), plan.trialDays) : null },
      });
      await tx.business.update({ where: { id: businessId }, data: { planId: plan.id } });
      await tx.merchantPlanHistory.create({ data: { businessId, oldPlanId: current.planId, newPlanId: plan.id, actorUserId: actorId, reason } });
      await this.audit.create({ userId: actorId, businessId, action: "subscription_plan_changed", entityType: "business_subscription", entityId: subscription.id, metadata: { oldPlanId: current.planId, newPlanId: plan.id, reason } }, tx);
      return subscription;
    });
  }

  async grantTrial(businessId: string, days: number, reason: string, actorId: string) {
    const now = new Date();
    const trialEndsAt = this.addDays(now, days);
    const subscription = await this.prisma.businessSubscription.update({ where: { businessId }, data: { status: SubscriptionStatus.TRIALING, trialEndsAt, nextBillingAt: trialEndsAt, graceEndsAt: null } });
    await this.audit.create({ userId: actorId, businessId, action: "subscription_trial_granted", entityType: "business_subscription", entityId: subscription.id, metadata: { days, reason } });
    return subscription;
  }

  async suspendSubscription(businessId: string, reason: string, actorId: string) {
    const subscription = await this.prisma.businessSubscription.update({ where: { businessId }, data: { status: SubscriptionStatus.SUSPENDED, graceEndsAt: null } });
    await this.prisma.business.update({ where: { id: businessId }, data: { status: BusinessStatus.SUSPENDED } });
    await this.audit.create({ userId: actorId, businessId, action: "subscription_suspended", entityType: "business_subscription", entityId: subscription.id, metadata: { reason } });
    return subscription;
  }

  async reactivateSubscription(businessId: string, reason: string, actorId: string) {
    const subscription = await this.prisma.businessSubscription.update({ where: { businessId }, data: { status: SubscriptionStatus.ACTIVE, graceEndsAt: null, cancelledAt: null, cancellationReason: null } });
    await this.prisma.business.update({ where: { id: businessId }, data: { status: BusinessStatus.ACTIVE } });
    await this.audit.create({ userId: actorId, businessId, action: "subscription_reactivated", entityType: "business_subscription", entityId: subscription.id, metadata: { reason } });
    return subscription;
  }

  async cancelSubscription(businessId: string, reason: string, actorId: string) {
    const subscription = await this.prisma.businessSubscription.update({ where: { businessId }, data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason } });
    await this.prisma.business.update({ where: { id: businessId }, data: { status: BusinessStatus.CANCELLED } });
    await this.audit.create({ userId: actorId, businessId, action: "subscription_cancelled", entityType: "business_subscription", entityId: subscription.id, metadata: { reason } });
    return subscription;
  }
  async globalUsers(role: keyof typeof UserRole, q = "") {
    const where: Prisma.UserWhereInput = {
      role: UserRole[role],
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { rut: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return this.prisma.user.findMany({
      where,
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rut: true,
        role: true,
        status: true,
        birthDate: true,
        createdAt: true,
        customerBusinesses: {
          include: {
            business: { select: { id: true, name: true, status: true } },
          },
        },
        businessMemberships: {
          include: {
            business: { select: { id: true, name: true, status: true } },
          },
        },
        _count: { select: { customerTransactions: true, rewards: true } },
      },
    });
  }
  async cashiers(businessId?: string, q = "") {
    const memberships = await this.prisma.businessUser.findMany({
      where: {
        role: UserRole.CASHIER,
        ...(businessId ? { businessId } : {}),
        user: q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ],
            }
          : undefined,
      },
      take: 100,
      include: {
        business: { select: { id: true, name: true, status: true } },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            lockedAt: true,
            _count: {
              select: { performedTransactions: true, redeemedRewards: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return memberships.map((m) => ({
      ...m.user,
      membershipStatus: m.status,
      business: m.business,
    }));
  }
  async customerFull(id: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rut: true,
        birthDate: true,
        status: true,
        customerBusinesses: { include: { business: true } },
        cycles: {
          include: {
            business: { select: { id: true, name: true } },
            loyaltyProgram: true,
          },
          orderBy: { createdAt: "desc" },
        },
        rewards: {
          include: { business: { select: { id: true, name: true } } },
          orderBy: { generatedAt: "desc" },
          take: 50,
        },
        customerTransactions: {
          include: {
            business: { select: { id: true, name: true } },
            performedBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        manualAdjustmentsFor: {
          include: {
            business: { select: { name: true } },
            actor: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        },
      },
    });
    if (!customer) throw new NotFoundException("Cliente no encontrado");
    return customer;
  }
  async manualAdjustment(
    customerId: string,
    dto: ManualAdjustmentDto,
    actorId: string,
  ) {
    if (!dto.reason.trim())
      throw new ConflictException("El motivo es obligatorio.");
    return this.prisma.$transaction(async (tx) => {
      const cycle = await tx.cycle.findFirst({
        where: {
          customerUserId: customerId,
          businessId: dto.businessId,
          status: CycleStatus.ACTIVE,
        },
        orderBy: { createdAt: "desc" },
      });
      if (!cycle)
        throw new NotFoundException(
          "El cliente no tiene ciclo activo en ese comercio",
        );
      const next = Math.max(0, Number(cycle.currentValue) + Number(dto.value));
      await tx.cycle.update({
        where: { id: cycle.id },
        data: { currentValue: new Prisma.Decimal(next) },
      });
      const adjustment = await tx.manualAdjustment.create({
        data: {
          customerUserId: customerId,
          businessId: dto.businessId,
          actorUserId: actorId,
          type: dto.type,
          value: new Prisma.Decimal(dto.value),
          reason: dto.reason,
        },
      });
      await this.audit.create(
        {
          userId: actorId,
          businessId: dto.businessId,
          action: "manual_customer_adjustment",
          entityType: "user",
          entityId: customerId,
          metadata: {
            type: dto.type,
            value: dto.value,
            reason: dto.reason,
            new_progress: next,
          },
        },
        tx,
      );
      return adjustment;
    });
  }
  async manualReward(
    customerId: string,
    dto: ManualRewardDto,
    actorId: string,
  ) {
    if (!dto.reason.trim())
      throw new ConflictException("El motivo es obligatorio.");
    return this.prisma.$transaction(async (tx) => {
      const cycle = await tx.cycle.findFirst({
        where: {
          customerUserId: customerId,
          businessId: dto.businessId,
          status: CycleStatus.ACTIVE,
        },
        orderBy: { createdAt: "desc" },
      });
      if (!cycle)
        throw new NotFoundException(
          "El cliente no tiene ciclo activo en ese comercio",
        );
      const reward = await tx.reward.create({
        data: {
          cycleId: cycle.id,
          businessId: dto.businessId,
          customerUserId: customerId,
          rewardDescription: dto.description,
        },
      });
      await tx.manualAdjustment.create({
        data: {
          customerUserId: customerId,
          businessId: dto.businessId,
          actorUserId: actorId,
          type: "manual_reward",
          value: new Prisma.Decimal(1),
          reason: dto.reason,
        },
      });
      await this.audit.create(
        {
          userId: actorId,
          businessId: dto.businessId,
          action: "manual_reward_granted",
          entityType: "reward",
          entityId: reward.id,
          metadata: { customerId, reason: dto.reason },
        },
        tx,
      );
      const customer = await tx.user.findUnique({ where: { id: customerId }, select: { name: true, email: true } });
      const business = await tx.business.findUnique({ where: { id: dto.businessId }, select: { name: true } });
      if (customer && business) void this.email.rewardEarned(customer.email, customer.name, business.name, reward.rewardDescription, reward.expiresAt);
      return reward;
    });
  }
  supportNotes(userId: string) {
    return this.prisma.supportNote.findMany({
      where: { subjectUserId: userId },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  async addSupportNote(userId: string, note: string, actorId: string) {
    const created = await this.prisma.supportNote.create({
      data: { subjectUserId: userId, authorUserId: actorId, note },
    });
    await this.audit.create({
      userId: actorId,
      action: "support_note_created",
      entityType: "user",
      entityId: userId,
    });
    return created;
  }
  auditLogs(q: Record<string, string>) {
    return this.audit.listAudit(q);
  }
  auditDetail(id: string) {
    return this.audit.auditDetail(id);
  }
  exportAudit(q: Record<string, string>, actorId: string) {
    return this.audit.exportAuditCsv(q, actorId);
  }
  auditRetentionDryRun() {
    return this.audit.retentionDryRun();
  }
  systemErrors(q: Record<string, string>) {
    return this.audit.listErrors(q);
  }
  systemErrorDetail(id: string) {
    return this.audit.errorDetail(id);
  }
  updateSystemErrorStatus(id: string, status: "OPEN" | "INVESTIGATING" | "RESOLVED", note: string, actorId: string) {
    return this.audit.updateErrorStatus(id, status as any, note, actorId);
  }
  async globalSettings() {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: "global" },
    });
    return (
      row?.value ?? {
        platformName: "MiClub Chile",
        welcomeMessage: "Clientes que vuelven, comercios que crecen.",
        primaryColor: "#6d28d9",
        secondaryColor: "#06b6d4",
        rewardExpirationDays: 30,
        modules: {
          notifications: false,
          billing: false,
          advancedExports: true,
        },
        policies: "Las acciones críticas requieren motivo y quedan auditadas.",
      }
    );
  }
  async updateGlobalSettings(value: any, actorId: string) {
    const row = await this.prisma.systemSetting.upsert({
      where: { key: "global" },
      update: { value, updatedById: actorId },
      create: { key: "global", value, updatedById: actorId },
    });
    await this.audit.create({
      userId: actorId,
      action: "global_settings_updated",
      entityType: "system_setting",
      entityId: "global",
    });
    return row.value;
  }
  async startImpersonation(actorId: string, targetId: string, reason: string) {
    if (!reason.trim())
      throw new ConflictException("El motivo es obligatorio.");
    const target = await this.prisma.user.findUniqueOrThrow({
      where: { id: targetId },
      select: publicUserSelect,
    });
    const session = await this.prisma.impersonationSession.create({
      data: {
        actorUserId: actorId,
        targetUserId: targetId,
        targetRole: target.role,
        reason,
      },
    });
    await this.audit.create({
      userId: actorId,
      action: "impersonation_started",
      entityType: "user",
      entityId: targetId,
      metadata: {
        reason,
        impersonation_session_id: session.id,
        target_role: target.role,
      },
    });
    return {
      sessionId: session.id,
      target,
      reason,
      banner: `Estás viendo como ${target.role}: ${target.name}`,
    };
  }
  async maintenance() {
    const [users, businesses, auditCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.business.count(),
      this.prisma.auditLog.count(),
    ]);
    return {
      api: "ok",
      database: "ok",
      users,
      businesses,
      auditCount,
      frontendVersion: process.env.npm_package_version ?? "1.1.0",
      backendVersion: process.env.npm_package_version ?? "1.1.0",
      environment: process.env.NODE_ENV ?? "development",
      environmentLabel: process.env.ENVIRONMENT_LABEL ?? null,
      domains: [
        process.env.FRONTEND_URL ?? "https://miclubchile.cl",
        process.env.CUSTOMER_APP_URL ?? "https://app.miclubchile.cl",
        process.env.COMMERCE_APP_URL ?? "https://comercio.miclubchile.cl",
        process.env.CASHIER_APP_URL ?? "https://cajero.miclubchile.cl",
        process.env.ADMIN_APP_URL ?? "https://admin.miclubchile.cl",
        process.env.API_URL ?? "https://api.miclubchile.cl/api",
      ],
    };
  }
  async exportData(entity: string) {
    if (entity === "businesses")
      return this.prisma.business.findMany({
        include: { plan: true, owner: { select: publicUserSelect } },
      });
    if (entity === "customers")
      return this.prisma.user.findMany({
        where: { role: UserRole.CUSTOMER },
        select: publicUserSelect,
      });
    if (entity === "transactions")
      return this.prisma.transaction.findMany({
        take: 1000,
        orderBy: { createdAt: "desc" },
      });
    if (entity === "rewards")
      return this.prisma.reward.findMany({
        take: 1000,
        orderBy: { generatedAt: "desc" },
      });
    if (entity === "audit") return this.auditLogs({});
    throw new NotFoundException("Exportación no soportada");
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

  private planDto(plan: any) {
    return {
      ...plan,
      monthlyPrice: Number(plan.monthlyPrice),
      features: Array.isArray(plan.features) ? plan.features : [],
      active: plan.status ? plan.status === PlanStatus.ACTIVE : plan.active,
    };
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 86_400_000);
  }

  private addPeriod(date: Date, period: BillingPeriod) {
    const next = new Date(date);
    if (period === BillingPeriod.YEARLY) next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    return next;
  }

  private subscriptionStatus(status?: string) {
    if (!status || status === "all") return undefined;
    return SubscriptionStatus[status.toUpperCase() as keyof typeof SubscriptionStatus];
  }

  private paymentStatus(status?: string) {
    if (!status || status === "all") return undefined;
    return PaymentStatus[status.toUpperCase() as keyof typeof PaymentStatus];
  }
}
