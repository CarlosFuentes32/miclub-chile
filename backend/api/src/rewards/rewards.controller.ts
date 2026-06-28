import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtUser } from '../auth/auth.types';import { CurrentUser } from '../auth/decorators/current-user.decorator';import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';import { RedeemRewardDto } from './dto/redeem-reward.dto';import { RewardsService } from './rewards.service';
@Controller('cashier/rewards') @UseGuards(JwtAuthGuard)
export class RewardsController { constructor(private readonly rewards: RewardsService) {} @Post('redeem') redeem(@CurrentUser() user: JwtUser,@Body() dto:RedeemRewardDto){return this.rewards.redeem(user.id,dto.reward_id,dto.business_id)} }
