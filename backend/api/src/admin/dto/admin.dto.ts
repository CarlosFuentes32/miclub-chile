import { IsArray,IsBoolean,IsEmail,IsInt,IsNumber,IsOptional,IsPositive,IsString,MinLength } from 'class-validator';

export class StatusDto{@IsString()status!:string}

export class PlanDto{@IsString()name!:string;@IsNumber()@IsPositive()monthlyPrice!:number;@IsInt()@IsPositive()customerLimit!:number;@IsInt()@IsPositive()collaboratorLimit!:number;@IsArray()@IsString({each:true})features!:string[];@IsOptional()@IsBoolean()active?:boolean}

export class CreateBusinessDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) businessType!: string;
  @IsOptional() @IsString() rutBusiness?: string;
  @IsString() @MinLength(5) address!: string;
  @IsString() @MinLength(8) phone!: string;
  @IsEmail() email!: string;
  @IsString() planId!: string;
  @IsString() @MinLength(2) ownerName!: string;
  @IsEmail() ownerEmail!: string;
  @IsString() @MinLength(8) ownerPhone!: string;
  @IsString() @MinLength(8) ownerPassword!: string;
}
