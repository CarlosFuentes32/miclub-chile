import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import { ManualMovementType, ManualRegistrationReason, MembershipStatus } from '@prisma/client';

export class CreateManualCustomerDto {
  @IsString() business_id!: string;
  @IsString() @MinLength(1) @MaxLength(80) first_name!: string;
  @IsString() @MinLength(1) @MaxLength(80) last_name!: string;
  @IsOptional() @IsString() @MaxLength(20) rut?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsDateString() birth_date?: string;
  @IsOptional() @IsBoolean() is_senior?: boolean;
  @IsOptional() @IsEnum(ManualRegistrationReason) registration_reason?: ManualRegistrationReason;
  @IsOptional() @IsString() @MaxLength(500) observation?: string;
  @IsOptional() @IsEnum(MembershipStatus) status?: MembershipStatus;
}
export class UpdateManualCustomerDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) first_name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) last_name?: string;
  @IsOptional() @IsString() @MaxLength(20) rut?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsDateString() birth_date?: string;
  @IsOptional() @IsBoolean() is_senior?: boolean;
  @IsOptional() @IsEnum(ManualRegistrationReason) registration_reason?: ManualRegistrationReason;
  @IsOptional() @IsString() @MaxLength(500) observation?: string;
  @IsOptional() @IsEnum(MembershipStatus) status?: MembershipStatus;
}
export class AddManualMovementDto {
  @IsString() business_id!: string;
  @IsEnum(ManualMovementType) type!: ManualMovementType;
  @IsOptional() @IsNumber() @IsPositive() value?: number;
  @IsOptional() @IsString() @MaxLength(250) note?: string;
}
export class RedeemManualBenefitDto { @IsString() business_id!: string; @IsOptional() @IsString() @MaxLength(250) note?: string; }
