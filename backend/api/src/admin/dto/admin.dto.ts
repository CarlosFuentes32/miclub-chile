import {
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
  @IsInt() @IsPositive() customerLimit!: number;
  @IsInt() @IsPositive() collaboratorLimit!: number;
  @IsArray() @IsString({ each: true }) features!: string[];
  @IsOptional() @IsBoolean() active?: boolean;
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
  @IsString() @MinLength(4) ownerPassword!: string;
  @IsString() region!: string;
  @IsString() commune!: string;
}

export class UpdateAdminUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @Matches(/^\+569\d{8}$/) phone?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}
export class ChangePasswordDto {
  @IsString() @MinLength(4) password!: string;
}
