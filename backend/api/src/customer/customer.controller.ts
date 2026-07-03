import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomerService } from './customer.service';

@Controller('customer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}
  @Get('home') home(@CurrentUser() user: JwtUser) { return this.customer.home(user.id); }
  @Get('rewards') rewards(@CurrentUser() user: JwtUser) { return this.customer.rewards(user.id); }
  @Get('history') history(@CurrentUser() user: JwtUser) { return this.customer.history(user.id); }
  @Get('businesses/:slug/membership') membership(@CurrentUser() user: JwtUser, @Param('slug') slug: string) { return this.customer.membership(user.id, slug); }
  @Post('businesses/:slug/join') join(@CurrentUser() user: JwtUser, @Param('slug') slug: string) { return this.customer.join(user.id, slug); }
}

@Controller('public/businesses')
export class PublicBusinessController {
  constructor(private readonly customer: CustomerService) {}
  @Get(':slug') find(@Param('slug') slug: string) { return this.customer.businessBySlug(slug); }
}
