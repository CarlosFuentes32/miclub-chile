import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtUser } from '../auth/auth.types';import { CurrentUser } from '../auth/decorators/current-user.decorator';import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';import { LoyaltyEngineService } from '../loyalty/loyalty-engine.service';import { CashierService } from './cashier.service';import { RegisterTransactionDto } from './dto/register-transaction.dto';import { ScanCustomerDto } from './dto/scan-customer.dto';
@Controller('cashier') @UseGuards(JwtAuthGuard)
export class CashierController {
  constructor(private readonly cashier:CashierService,private readonly engine:LoyaltyEngineService){}
  @Post('scan-customer') scan(@CurrentUser() user:JwtUser,@Body() dto:ScanCustomerDto){return this.cashier.scan(user.id,dto.business_id,dto.qr_token)}
  @Get('customers/search') search(@CurrentUser() user:JwtUser,@Query('phone') phone:string,@Query('business_id') businessId:string){return this.cashier.search(user.id,businessId,phone??'')}
  @Post('transactions') transaction(@CurrentUser() user:JwtUser,@Body() dto:RegisterTransactionDto){return this.engine.register({businessId:dto.business_id,customerUserId:dto.customer_user_id,performedByUserId:user.id,value:dto.value,amount:dto.amount})}
  @Post('transactions/:id/cancel') cancel(@CurrentUser() user:JwtUser,@Param('id') id:string){return this.engine.cancel(id,user.id)}
}
