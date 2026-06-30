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
import {
  ChangePasswordDto,
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
  ) {
    return this.admin.updateUser(id, d);
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
  ) {
    return this.admin.changePassword(id, d.password);
  }
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
