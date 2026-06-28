import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { LoyaltyEngineService } from './loyalty-engine.service';
import { LoyaltyProgramsController } from './loyalty-programs.controller';
import { LoyaltyProgramsService } from './loyalty-programs.service';
@Module({ imports: [BusinessesModule], controllers: [LoyaltyProgramsController], providers: [LoyaltyEngineService, LoyaltyProgramsService], exports: [LoyaltyEngineService, LoyaltyProgramsService] })
export class LoyaltyModule {}
