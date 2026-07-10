import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateBusinessRewardDto, UpdateBusinessRewardDto } from "./dto/manage-reward.dto";
import { RedeemRewardDto } from "./dto/redeem-reward.dto";
import { RewardsService } from "./rewards.service";

@Controller("cashier/rewards")
@UseGuards(JwtAuthGuard)
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Post("redeem")
  redeem(@CurrentUser() user: JwtUser, @Body() dto: RedeemRewardDto) {
    return this.rewards.redeem(user.id, dto.reward_id, dto.business_id);
  }
}

@Controller("business/rewards")
@UseGuards(JwtAuthGuard)
export class BusinessRewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateBusinessRewardDto) {
    return this.rewards.createManual(user.id, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtUser, @Param("id") id: string, @Body() dto: UpdateBusinessRewardDto) {
    return this.rewards.updateBusinessReward(user.id, id, dto);
  }

  @Delete(":id")
  cancel(@CurrentUser() user: JwtUser, @Param("id") id: string, @Body() dto: { business_id: string }) {
    return this.rewards.cancelBusinessReward(user.id, id, dto.business_id);
  }
}
