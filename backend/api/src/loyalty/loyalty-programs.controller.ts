import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtUser } from '../auth/auth.types';
import { CreateLoyaltyProgramDto, UpdateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
import { LoyaltyProgramsService } from './loyalty-programs.service';

@Controller('business/loyalty-programs') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.BUSINESS_ADMIN, UserRole.BUSINESS_OWNER)
export class LoyaltyProgramsController {
  constructor(private readonly programs: LoyaltyProgramsService) {}
  @Post() create(@CurrentUser() user: JwtUser, @Body() dto: CreateLoyaltyProgramDto) { return this.programs.create(user.id, dto); }
  @Get() list(@CurrentUser() user: JwtUser, @Query('business_id') businessId: string) { return this.programs.list(user.id, businessId); }
  @Get('active') active(@CurrentUser() user: JwtUser, @Query('business_id') businessId: string) { return this.programs.active(user.id, businessId); }
  @Patch(':id') update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateLoyaltyProgramDto) { return this.programs.update(user.id, id, dto); }
  @Post(':id/activate') activate(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: { business_id: string }) { return this.programs.activate(user.id, id, dto.business_id); }
  @Delete(':id') archive(@CurrentUser() user: JwtUser, @Param('id') id: string, @Query('business_id') businessId: string) { return this.programs.archive(user.id, id, businessId); }
}
