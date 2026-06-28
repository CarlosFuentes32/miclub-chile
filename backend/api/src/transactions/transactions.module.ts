import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CashierController } from './cashier.controller';
import { CashierService } from './cashier.service';
@Module({ imports: [AuthModule, BusinessesModule, LoyaltyModule], controllers: [CashierController], providers: [CashierService] })
export class TransactionsModule {}
