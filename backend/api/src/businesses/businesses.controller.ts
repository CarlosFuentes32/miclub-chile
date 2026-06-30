import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "@prisma/client";
import { BusinessesService } from "./businesses.service";
import {
  CreateCollaboratorDto,
  UpdateBusinessDto,
  UpdateCollaboratorDto,
} from "./dto/business.dto";
@Controller("business")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_ADMIN, UserRole.CASHIER)
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}
  @Get("mine") mine(@CurrentUser() user: JwtUser) {
    return this.businesses.mine(user.id);
  }
  @Get("dashboard") dashboard(
    @CurrentUser() user: JwtUser,
    @Query("business_id") id: string,
  ) {
    return this.businesses.dashboard(user.id, id);
  }
  @Get("settings") settings(
    @CurrentUser() u: JwtUser,
    @Query("business_id") id: string,
  ) {
    return this.businesses.settings(u.id, id);
  }
  @Patch("settings") updateSettings(
    @CurrentUser() u: JwtUser,
    @Query("business_id") id: string,
    @Body() d: UpdateBusinessDto,
  ) {
    return this.businesses.updateSettings(u.id, id, d);
  }
  @Get("customers") customers(
    @CurrentUser() u: JwtUser,
    @Query("business_id") id: string,
    @Query("q") q: string,
  ) {
    return this.businesses.customers(u.id, id, q);
  }
  @Get("customers/:customerId") detail(
    @CurrentUser() u: JwtUser,
    @Param("customerId") cid: string,
    @Query("business_id") id: string,
  ) {
    return this.businesses.customerDetail(u.id, id, cid);
  }
  @Get("rewards") rewards(
    @CurrentUser() u: JwtUser,
    @Query("business_id") id: string,
    @Query("status") s: string,
  ) {
    return this.businesses.rewards(u.id, id, s);
  }
  @Get("collaborators") collabs(
    @CurrentUser() u: JwtUser,
    @Query("business_id") id: string,
  ) {
    return this.businesses.collaborators(u.id, id);
  }
  @Post("collaborators") createCollab(
    @CurrentUser() u: JwtUser,
    @Query("business_id") id: string,
    @Body() d: CreateCollaboratorDto,
  ) {
    return this.businesses.createCollaborator(u.id, id, d);
  }
  @Patch("collaborators/:membershipId") updateCollab(
    @CurrentUser() u: JwtUser,
    @Param("membershipId") mid: string,
    @Query("business_id") id: string,
    @Body() d: UpdateCollaboratorDto,
  ) {
    return this.businesses.updateCollaborator(u.id, id, mid, d);
  }
  @Get("qr-material") qr(
    @CurrentUser() u: JwtUser,
    @Query("business_id") id: string,
  ) {
    return this.businesses.qrMaterial(u.id, id);
  }
}
