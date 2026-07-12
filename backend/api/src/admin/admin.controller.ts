import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminService } from "./admin.service";
import { ObservabilityService } from "../observability/observability.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtUser } from "../auth/auth.types";
import {
  ChangePasswordDto,
  ChangeSubscriptionPlanDto,
  CancelSubscriptionDto,
  CorrectRutDto,
  CreateBusinessDto,
  ManualAdjustmentDto,
  ManualPaymentDto,
  ManualRewardDto,
  PlanDto,
  ReasonDto,
  StatusDto,
  SupportNoteDto,
  TrialGrantDto,
  UpdateAdminUserDto,
  UpdateBusinessDto,
} from "./dto/admin.dto";
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MICLUB_ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly observability: ObservabilityService,
  ) {}
  @Get("dashboard") dashboard() {
    return this.admin.dashboard();
  }
  @Get("businesses") businesses() {
    return this.admin.businesses();
  }
  @Get("super/dashboard")
  @Roles(UserRole.SUPER_ADMIN)
  superDashboard() {
    return this.admin.superDashboard();
  }
  @Get("system-status")
  @Roles(UserRole.SUPER_ADMIN)
  systemStatus() {
    return this.observability.getEnterpriseHealth();
  }
  @Get("security")
  @Roles(UserRole.SUPER_ADMIN)
  security(@Query() q: Record<string, string>) {
    return this.admin.securityDashboard(q);
  }
  @Post("security/sessions/:id/revoke")
  @Roles(UserRole.SUPER_ADMIN)
  revokeSession(@Param("id") id: string, @CurrentUser() actor: JwtUser) {
    return this.admin.revokeSession(id, actor.id);
  }
  @Post("security/users/:id/revoke-sessions")
  @Roles(UserRole.SUPER_ADMIN)
  revokeUserSessions(@Param("id") id: string, @CurrentUser() actor: JwtUser) {
    return this.admin.revokeUserSessions(id, actor.id);
  }
  @Post("businesses") createBusiness(
    @Body() d: CreateBusinessDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.createBusiness(d, actor.id);
  }
  @Get("businesses/:id") business(@Param("id") id: string) {
    return this.admin.business(id);
  }
  @Patch("businesses/:id") updateBusiness(
    @Param("id") id: string,
    @Body() d: UpdateBusinessDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.updateBusiness(id, d, actor.id);
  }
  @Get("businesses/:id/full")
  @Roles(UserRole.SUPER_ADMIN)
  businessFull(@Param("id") id: string) {
    return this.admin.businessFull(id);
  }
  @Patch("businesses/:id/status") businessStatus(
    @Param("id") id: string,
    @Body() d: StatusDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.businessStatus(id, d.status, actor.id);
  }
  @Delete("businesses/:id") deleteBusiness(
    @Param("id") id: string,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.deleteBusiness(id, actor.id);
  }
  @Post("businesses/:id/restore")
  @Roles(UserRole.SUPER_ADMIN)
  restoreBusiness(@Param("id") id: string, @CurrentUser() actor: JwtUser) {
    return this.admin.restoreBusiness(id, actor.id);
  }
  @Get("customers")
  @Roles(UserRole.SUPER_ADMIN)
  customers(@Query("q") q = "") {
    return this.admin.globalUsers("CUSTOMER", q);
  }
  @Get("cashiers")
  @Roles(UserRole.SUPER_ADMIN)
  cashiers(@Query("businessId") businessId?: string, @Query("q") q = "") {
    return this.admin.cashiers(businessId, q);
  }
  @Get("customers/:id/full")
  @Roles(UserRole.SUPER_ADMIN)
  customerFull(@Param("id") id: string) {
    return this.admin.customerFull(id);
  }
  @Post("customers/:id/adjust")
  @Roles(UserRole.SUPER_ADMIN)
  adjustCustomer(
    @Param("id") id: string,
    @Body() d: ManualAdjustmentDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.manualAdjustment(id, d, actor.id);
  }
  @Post("customers/:id/manual-reward")
  @Roles(UserRole.SUPER_ADMIN)
  manualReward(
    @Param("id") id: string,
    @Body() d: ManualRewardDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.manualReward(id, d, actor.id);
  }
  @Get("users") users(@Query("status") status?: string) {
    return this.admin.users(status);
  }
  @Get("users/:id") user(@Param("id") id: string) {
    return this.admin.user(id);
  }
  @Patch("users/:id") updateUser(
    @Param("id") id: string,
    @Body() d: UpdateAdminUserDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.updateUser(id, d, actor.id);
  }
  @Patch("users/:id/status") userStatus(
    @Param("id") id: string,
    @Body() d: StatusDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.userStatus(id, d.status, actor.id);
  }
  @Patch("users/:id/password") password(
    @Param("id") id: string,
    @Body() d: ChangePasswordDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.admin.changePassword(id, d.password, user.id);
  }
  @Post("support/users/:id/reset-password") resetPassword(
    @Param("id") id: string,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.resetPassword(id, actor.id);
  }
  @Post("support/users/:id/unlock") unlock(
    @Param("id") id: string,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.unlockUser(id, actor.id);
  }
  @Patch("support/users/:id/rut") correctRut(
    @Param("id") id: string,
    @Body() d: CorrectRutDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.correctRut(id, d.rut, d.confirmed, actor.id);
  }
  @Get("support/users/:id/history") history(@Param("id") id: string) {
    return this.admin.userHistory(id);
  }
  @Get("support/users/:id/notes")
  @Roles(UserRole.SUPER_ADMIN)
  notes(@Param("id") id: string) {
    return this.admin.supportNotes(id);
  }
  @Post("support/users/:id/notes")
  @Roles(UserRole.SUPER_ADMIN)
  addNote(
    @Param("id") id: string,
    @Body() d: SupportNoteDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.addSupportNote(id, d.note, actor.id);
  }
  @Get("support/:role") support(@Param("role") role: string) {
    return this.admin.supportUsers(role);
  }
  @Delete("users/:id") deleteUser(
    @Param("id") id: string,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.deleteUser(id, actor.id);
  }
  @Post("users/:id/reactivate") reactivateUser(
    @Param("id") id: string,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.reactivateUser(id, actor.id);
  }
  @Get("plans") plans() {
    return this.admin.plans();
  }
  @Post("plans") create(@Body() d: PlanDto) {
    return this.admin.createPlan(d);
  }
  @Patch("plans/:id") update(@Param("id") id: string, @Body() d: PlanDto) {
    return this.admin.updatePlan(id, d);
  }
  @Get("billing/subscriptions")
  @Roles(UserRole.SUPER_ADMIN)
  billingSubscriptions(@Query("status") status?: string) {
    return this.admin.billingSubscriptions(status);
  }
  @Get("billing/payments")
  @Roles(UserRole.SUPER_ADMIN)
  billingPayments(@Query("status") status?: string) {
    return this.admin.billingPayments(status);
  }
  @Post("billing/payments/manual")
  @Roles(UserRole.SUPER_ADMIN)
  manualPayment(@Body() d: ManualPaymentDto, @CurrentUser() actor: JwtUser) {
    return this.admin.registerManualPayment(d, actor.id);
  }
  @Patch("billing/subscriptions/:businessId/plan")
  @Roles(UserRole.SUPER_ADMIN)
  changeSubscriptionPlan(@Param("businessId") businessId: string, @Body() d: ChangeSubscriptionPlanDto, @CurrentUser() actor: JwtUser) {
    return this.admin.changeSubscriptionPlan(businessId, d.planId, d.reason, actor.id);
  }
  @Post("billing/subscriptions/:businessId/trial")
  @Roles(UserRole.SUPER_ADMIN)
  grantTrial(@Param("businessId") businessId: string, @Body() d: TrialGrantDto, @CurrentUser() actor: JwtUser) {
    return this.admin.grantTrial(businessId, d.days, d.reason, actor.id);
  }
  @Post("billing/subscriptions/:businessId/suspend")
  @Roles(UserRole.SUPER_ADMIN)
  suspendSubscription(@Param("businessId") businessId: string, @Body() d: ReasonDto, @CurrentUser() actor: JwtUser) {
    return this.admin.suspendSubscription(businessId, d.reason, actor.id);
  }
  @Post("billing/subscriptions/:businessId/reactivate")
  @Roles(UserRole.SUPER_ADMIN)
  reactivateSubscription(@Param("businessId") businessId: string, @Body() d: ReasonDto, @CurrentUser() actor: JwtUser) {
    return this.admin.reactivateSubscription(businessId, d.reason, actor.id);
  }
  @Post("billing/subscriptions/:businessId/cancel")
  @Roles(UserRole.SUPER_ADMIN)
  cancelSubscription(@Param("businessId") businessId: string, @Body() d: CancelSubscriptionDto, @CurrentUser() actor: JwtUser) {
    return this.admin.cancelSubscription(businessId, d.reason, actor.id);
  }
  @Get("reports") reports() {
    return this.admin.reports();
  }
  @Get("audit")
  @Roles(UserRole.SUPER_ADMIN)
  audit(@Query() q: Record<string, string>) {
    return this.admin.auditLogs(q);
  }
  @Get("audit/export")
  @Roles(UserRole.SUPER_ADMIN)
  exportAudit(@Query() q: Record<string, string>, @CurrentUser() actor: JwtUser) {
    return this.admin.exportAudit(q, actor.id);
  }
  @Get("audit/retention/dry-run")
  @Roles(UserRole.SUPER_ADMIN)
  retentionDryRun() {
    return this.admin.auditRetentionDryRun();
  }
  @Get("audit/:id")
  @Roles(UserRole.SUPER_ADMIN)
  auditDetail(@Param("id") id: string) {
    return this.admin.auditDetail(id);
  }
  @Get("errors")
  @Roles(UserRole.SUPER_ADMIN)
  errors(@Query() q: Record<string, string>) {
    return this.admin.systemErrors(q);
  }
  @Get("errors/:id")
  @Roles(UserRole.SUPER_ADMIN)
  errorDetail(@Param("id") id: string) {
    return this.admin.systemErrorDetail(id);
  }
  @Patch("errors/:id/status")
  @Roles(UserRole.SUPER_ADMIN)
  updateErrorStatus(
    @Param("id") id: string,
    @Body() body: { status: "OPEN" | "INVESTIGATING" | "RESOLVED"; note?: string },
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.updateSystemErrorStatus(id, body.status, body.note ?? "", actor.id);
  }
  @Get("global-settings")
  @Roles(UserRole.SUPER_ADMIN)
  globalSettings() {
    return this.admin.globalSettings();
  }
  @Patch("global-settings")
  @Roles(UserRole.SUPER_ADMIN)
  updateGlobalSettings(@Body() body: any, @CurrentUser() actor: JwtUser) {
    return this.admin.updateGlobalSettings(body, actor.id);
  }
  @Post("impersonation/:targetId")
  @Roles(UserRole.SUPER_ADMIN)
  impersonate(
    @Param("targetId") targetId: string,
    @Body() d: ReasonDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.admin.startImpersonation(actor.id, targetId, d.reason);
  }
  @Get("maintenance")
  @Roles(UserRole.SUPER_ADMIN)
  maintenance() {
    return this.admin.maintenance();
  }
  @Get("export/:entity")
  @Roles(UserRole.SUPER_ADMIN)
  export(@Param("entity") entity: string, @Query("reason") reason: string, @CurrentUser() actor: JwtUser) {
    return this.admin.exportData(entity, actor.id, reason);
  }
}
