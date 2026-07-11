import {
  IsIn,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import { UserRole } from "@prisma/client";

export class StatusDto {
  @IsString() status!: string;
}

export class PlanDto {
  @IsString() name!: string;
  @IsNumber() @IsPositive() monthlyPrice!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsIn(["MONTHLY", "YEARLY"]) billingPeriod?: "MONTHLY" | "YEARLY";
  @IsOptional() @IsInt() trialDays?: number;
  @IsInt() @IsPositive() customerLimit!: number;
  @IsInt() @IsPositive() collaboratorLimit!: number;
  @IsArray() @IsString({ each: true }) features!: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ManualPaymentDto {
  @IsString() businessId!: string;
  @IsString() planId!: string;
  @IsNumber() @IsPositive() amount!: number;
  @IsOptional() @IsString() currency?: string;
  @IsString() @MinLength(3) reference!: string;
  @IsString() @MinLength(5) reason!: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() idempotencyKey?: string;
  @IsOptional() @IsString() paidAt?: string;
}

export class ChangeSubscriptionPlanDto {
  @IsString() planId!: string;
  @IsString() @MinLength(5) reason!: string;
}

export class TrialGrantDto {
  @IsInt() @IsPositive() days!: number;
  @IsString() @MinLength(5) reason!: string;
}

export class CancelSubscriptionDto {
  @IsString() @MinLength(5) reason!: string;
}

export class CreateBusinessDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) businessType!: string;
  @IsOptional() @IsString() rutBusiness?: string;
  @IsString() @MinLength(5) address!: string;
  @Matches(/^\+569\d{8}$/) phone!: string;
  @IsEmail() email!: string;
  @IsString() planId!: string;
  @IsString() @MinLength(2) ownerName!: string;
  @IsEmail() ownerEmail!: string;
  @Matches(/^\+569\d{8}$/) ownerPhone!: string;
  @IsString() @MinLength(8) ownerPassword!: string;
  @IsString() region!: string;
  @IsString() commune!: string;
}

export class UpdateBusinessDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() @MinLength(2) businessType?: string;
  @IsOptional() @IsString() rutBusiness?: string;
  @IsOptional() @IsString() @MinLength(5) address?: string;
  @IsOptional() @Matches(/^\+569\d{8}$/) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() planId?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() commune?: string;
}

export class UpdateAdminUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @Matches(/^\+569\d{8}$/) phone?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}
export class ChangePasswordDto {
  @IsString() @MinLength(8) password!: string;
}
export class CorrectRutDto {
  @IsString() @MinLength(7) rut!: string;
  @IsBoolean() confirmed!: boolean;
}

export class ReasonDto {
  @IsString() @MinLength(5) reason!: string;
}

export class SupportNoteDto {
  @IsString() @MinLength(3) note!: string;
}

export class ManualAdjustmentDto {
  @IsString() businessId!: string;
  @IsIn(["points", "stamps", "purchases"]) type!: string;
  @IsNumber() value!: number;
  @IsString() @MinLength(5) reason!: string;
}

export class ManualRewardDto {
  @IsString() businessId!: string;
  @IsString() @MinLength(3) description!: string;
  @IsString() @MinLength(5) reason!: string;
}
