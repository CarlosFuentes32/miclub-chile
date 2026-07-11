import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { BackupType, UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtUser } from "../auth/auth.types";
import { BackupsService } from "./backups.service";

@Controller("admin/backups")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}

  @Get("overview")
  overview() {
    return this.backups.overview();
  }

  @Get()
  list(@Query("limit") limit?: string) {
    return this.backups.listBackups(Number(limit ?? 50));
  }

  @Post()
  create(
    @Body() body: { type?: BackupType; reason?: string; beforeOperation?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.backups.createBackup(body, user);
  }

  @Post("validate-latest")
  validateLatest() {
    return this.backups.validateLatestBackup();
  }

  @Get("restores")
  restores(@Query("limit") limit?: string) {
    return this.backups.listRestores(Number(limit ?? 30));
  }

  @Post("restores")
  restoreDrill(
    @Body() body: {
      backupId?: string;
      targetEnvironment?: string;
      temporaryDatabaseRef?: string;
      reason?: string;
      confirmedTemporaryRestore?: boolean;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.backups.createRestoreDrill(body, user);
  }

  @Get("rollbacks")
  rollbacks(@Query("limit") limit?: string) {
    return this.backups.listRollbacks(Number(limit ?? 30));
  }

  @Post("rollbacks")
  rollbackPlan(
    @Body() body: {
      reason: string;
      toCommit?: string;
      backupId?: string;
      includeDatabase?: boolean;
      includeVariables?: boolean;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.backups.createRollbackPlan(body, user);
  }

  @Post("simulate")
  simulate(@CurrentUser() user: JwtUser) {
    return this.backups.simulate(user);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.backups.listBackups(200).then((rows) => rows.find((row) => row.id === id) ?? null);
  }
}
