import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException, UseGuards } from "@nestjs/common";
import { IncidentSeverity, IncidentStatus, UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtUser } from "../auth/auth.types";
import { IncidentsService } from "./incidents.service";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

@Controller("admin/incidents")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminIncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Get()
  list(@Query() query: Record<string, string>) {
    return this.incidents.list(query);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.incidents.detail(id);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() body: { status: IncidentStatus; note?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.incidents.updateStatus(id, body.status, user.id, body.note);
  }

  @Post(":id/notes")
  addNote(@Param("id") id: string, @Body() body: { note: string }, @CurrentUser() user: JwtUser) {
    return this.incidents.addNote(id, user.id, body.note);
  }

  @Post("simulate")
  simulate(@Body() body: { service: string; severity?: IncidentSeverity }, @CurrentUser() user: JwtUser) {
    return this.incidents.simulate(body.service, body.severity ?? IncidentSeverity.HIGH, user.id);
  }

  @Post("simulate/resolve")
  resolveSimulation(@Body() body: { service: string }, @CurrentUser() user: JwtUser) {
    return this.incidents.resolveSimulation(body.service, user.id);
  }
}

@Controller("monitoring")
export class MonitoringController {
  constructor(
    private readonly incidents: IncidentsService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("run")
  run(@Headers("x-monitoring-token") token?: string) {
    const expected = this.config.get<string>("MONITORING_TOKEN");
    if (!expected || token !== expected) throw new UnauthorizedException("Monitor no autorizado");
    return this.incidents.runMonitoring("scheduled-monitor");
  }

  @Post("e2e-result")
  e2eResult(
    @Headers("x-monitoring-token") token: string | undefined,
    @Body() body: { status: "ok" | "error"; runId?: string; runUrl?: string; commit?: string; environment?: string; executedAt?: string },
  ) {
    const expected = this.config.get<string>("MONITORING_TOKEN");
    if (!expected || token !== expected) throw new UnauthorizedException("Monitor no autorizado");
    const value = {
      status: body.status,
      runId: body.runId ?? "unknown",
      runUrl: body.runUrl ?? "",
      commit: body.commit ?? "unknown",
      environment: body.environment ?? this.config.get<string>("APP_ENV", "staging"),
      executedAt: body.executedAt ?? new Date().toISOString(),
    };
    return this.prisma.systemSetting.upsert({
      where: { key: "last_playwright_run" },
      create: { key: "last_playwright_run", value },
      update: { value },
    });
  }
}
