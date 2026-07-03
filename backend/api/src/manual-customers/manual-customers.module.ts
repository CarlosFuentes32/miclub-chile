import { Module } from '@nestjs/common';import { BusinessesModule } from '../businesses/businesses.module';import { ManualCustomersController } from './manual-customers.controller';import { ManualCustomersService } from './manual-customers.service';
@Module({imports:[BusinessesModule],controllers:[ManualCustomersController],providers:[ManualCustomersService]})export class ManualCustomersModule{}
