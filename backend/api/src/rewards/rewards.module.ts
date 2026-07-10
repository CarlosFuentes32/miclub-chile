import { Module } from "@nestjs/common";
import { BusinessesModule } from "../businesses/businesses.module";
import { EmailModule } from "../email/email.module";
import { BusinessRewardsController, RewardsController } from "./rewards.controller";
import { RewardsService } from "./rewards.service";

@Module({
  imports: [BusinessesModule, EmailModule],
  controllers: [RewardsController, BusinessRewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
