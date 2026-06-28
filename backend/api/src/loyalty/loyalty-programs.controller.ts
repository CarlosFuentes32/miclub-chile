import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtUser } from '../auth/auth.types';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
import { LoyaltyProgramsService } from './loyalty-programs.service';

@Controller('business/loyalty-programs') @UseGuards(JwtAuthGuard)
export class LoyaltyProgramsController {
  constructor(private readonly programs: LoyaltyProgramsService) {}
  @Post() create(@CurrentUser() user: JwtUser, @Body() dto: CreateLoyaltyProgramDto) { return this.programs.create(user.id, dto); }
  @Get('active') active(@CurrentUser() user: JwtUser, @Query('business_id') businessId: string) { return this.programs.active(user.id, businessId); }
}
