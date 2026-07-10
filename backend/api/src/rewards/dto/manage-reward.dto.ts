import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateBusinessRewardDto {
  @IsString() business_id!: string;
  @IsString() customer_user_id!: string;
  @IsString() @MinLength(3) reward_description!: string;
  @IsOptional() @IsDateString() expires_at?: string;
}

export class UpdateBusinessRewardDto {
  @IsString() business_id!: string;
  @IsOptional() @IsString() @MinLength(3) reward_description?: string;
  @IsOptional() @IsDateString() expires_at?: string;
}
