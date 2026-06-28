import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
@Module({ imports: [BusinessesModule], controllers: [RewardsController], providers: [RewardsService], exports: [RewardsService] })
export class RewardsModule {}
