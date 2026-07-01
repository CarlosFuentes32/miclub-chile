import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminService } from "./admin.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtUser } from "../auth/auth.types";
import {
  ChangePasswordDto,
  CorrectRutDto,
  CreateBusinessDto,
  PlanDto,
  StatusDto,
  UpdateAdminUserDto,
} from "./dto/admin.dto";
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MICLUB_ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get("dashboard") dashboard() {
    return this.admin.dashboard();
  }
  @Get("businesses") businesses() {
    return this.admin.businesses();
  }
  @Post("businesses") createBusiness(@Body() d: CreateBusinessDto) {
    return this.admin.createBusiness(d);
  }
  @Get("businesses/:id") business(@Param("id") id: string) {
    return this.admin.business(id);
  }
  @Patch("businesses/:id/status") businessStatus(
    @Param("id") id: string,
    @Body() d: StatusDto,
  ) {
    return this.admin.businessStatus(id, d.status);
  }
  @Delete("businesses/:id") deleteBusiness(@Param("id") id: string) {
    return this.admin.deleteBusiness(id);
  }
  @Get("users") users() {
    return this.admin.users();
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
  ) {
    return this.admin.userStatus(id, d.status);
  }
  @Patch("users/:id/password") password(
    @Param("id") id: string,
    @Body() d: ChangePasswordDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.admin.changePassword(id, d.password, user.id);
  }
  @Post("support/users/:id/reset-password") resetPassword(@Param("id") id:string,@CurrentUser() actor:JwtUser){return this.admin.resetPassword(id,actor.id)}
  @Post("support/users/:id/unlock") unlock(@Param("id") id:string,@CurrentUser() actor:JwtUser){return this.admin.unlockUser(id,actor.id)}
  @Patch("support/users/:id/rut") correctRut(@Param("id") id:string,@Body() d:CorrectRutDto,@CurrentUser() actor:JwtUser){return this.admin.correctRut(id,d.rut,d.confirmed,actor.id)}
  @Get("support/users/:id/history") history(@Param("id") id:string){return this.admin.userHistory(id)}
  @Get("support/:role") support(@Param("role") role:string){return this.admin.supportUsers(role)}
  @Delete("users/:id") deleteUser(@Param("id") id: string) {
    return this.admin.deleteUser(id);
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
  @Get("reports") reports() {
    return this.admin.reports();
  }
}
