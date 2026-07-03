import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerController, PublicBusinessController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({ imports: [AuthModule], controllers: [CustomerController, PublicBusinessController], providers: [CustomerService] })
export class CustomerModule {}
