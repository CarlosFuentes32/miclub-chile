import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { CyclesModule } from './cycles/cycles.module';
import { TransactionsModule } from './transactions/transactions.module';
import { RewardsModule } from './rewards/rewards.module';
import { AuditModule } from './audit/audit.module';
import { PrismaModule } from './prisma/prisma.module';
import { CustomerModule } from './customer/customer.module';
import { AdminModule } from './admin/admin.module';
import { ManualCustomersModule } from './manual-customers/manual-customers.module';
import { LeadsModule } from './leads/leads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    LoyaltyModule,
    CyclesModule,
    TransactionsModule,
    RewardsModule,
    AuditModule,
    CustomerModule,
    AdminModule,
    ManualCustomersModule,
    LeadsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
