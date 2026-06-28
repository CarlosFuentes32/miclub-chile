import { IsString } from 'class-validator';
export class RedeemRewardDto { @IsString() reward_id!: string; @IsString() business_id!: string; }
