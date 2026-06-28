import { AccumulationType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Min, MinLength } from 'class-validator';

export class CreateLoyaltyProgramDto {
  @IsString() business_id!: string;
  @IsString() @MinLength(2) name!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(AccumulationType) accumulation_type!: AccumulationType;
  @IsPositive() target_value!: number;
  @IsString() @MinLength(2) reward_description!: string;
  @IsOptional() @IsInt() @Min(1) reward_expiration_days?: number;
}
