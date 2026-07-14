import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateSupportTicketDto, SupportAccessDto, SupportNoteDto, SupportSearchDto, SupportToolDto, UpdateSupportTicketDto } from "./dto/support.dto";
import { SupportService } from "./support.service";

@Controller("support")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT, UserRole.SUPER_ADMIN)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() actor: JwtUser) {
    return this.support.dashboard(actor);
  }

  @Get("search")
  search(@Query() q: SupportSearchDto, @CurrentUser() actor: JwtUser) {
    return this.support.search(q, actor);
  }

  @Get("businesses/:id")
  business(@Param("id") id: string, @Query() q: SupportAccessDto, @CurrentUser() actor: JwtUser) {
    return this.support.business360(id, q, actor);
  }

  @Get("users/:id")
  user(@Param("id") id: string, @Query() q: SupportAccessDto, @CurrentUser() actor: JwtUser) {
    return this.support.user360(id, q, actor);
  }

  @Get("cashiers/:id")
  cashier(@Param("id") id: string, @Query() q: SupportAccessDto, @CurrentUser() actor: JwtUser) {
    return this.support.cashier360(id, q, actor);
  }

  @Get("tickets")
  tickets(@Query("status") status?: string) {
    return this.support.tickets(status);
  }

  @Post("tickets")
  createTicket(@Body() d: CreateSupportTicketDto, @CurrentUser() actor: JwtUser) {
    return this.support.createTicket(d, actor);
  }

  @Get("tickets/:id")
  ticket(@Param("id") id: string) {
    return this.support.ticket(id);
  }

  @Patch("tickets/:id")
  updateTicket(@Param("id") id: string, @Body() d: UpdateSupportTicketDto, @CurrentUser() actor: JwtUser) {
    return this.support.updateTicket(id, d, actor);
  }

  @Post("tickets/:id/notes")
  addTicketNote(@Param("id") id: string, @Body() d: SupportNoteDto, @CurrentUser() actor: JwtUser) {
    return this.support.addTicketNote(id, d.note, actor);
  }

  @Post("users/:id/password-reset")
  sendPasswordReset(@Param("id") id: string, @Body() d: SupportToolDto, @CurrentUser() actor: JwtUser) {
    return this.support.sendPasswordReset(id, d, actor);
  }

  @Post("users/:id/sessions/revoke")
  revokeSession(@Param("id") id: string, @Body() d: SupportToolDto, @CurrentUser() actor: JwtUser) {
    return this.support.revokeUserSession(id, d, actor);
  }

  @Post("users/:id/sessions/revoke-all")
  revokeAllSessions(@Param("id") id: string, @Body() d: SupportToolDto, @CurrentUser() actor: JwtUser) {
    return this.support.revokeAllUserSessions(id, d, actor);
  }

  @Post("users/:id/unlock")
  unlock(@Param("id") id: string, @Body() d: SupportToolDto, @CurrentUser() actor: JwtUser) {
    return this.support.unlockUser(id, d, actor);
  }

  @Post("impersonation/request")
  requestImpersonation(@Body() d: SupportAccessDto, @CurrentUser() actor: JwtUser) {
    return this.support.requestLimitedImpersonation(d, actor);
  }

  @Get("macros")
  macros() {
    return this.support.macros();
  }

  @Get("knowledge-base")
  knowledgeBase(@Query("q") q = "") {
    return this.support.knowledgeBase(q);
  }

  @Get("sla")
  sla() {
    return this.support.slaPolicies();
  }
}
