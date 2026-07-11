import { UserRole } from '@prisma/client';import { IsEmail,IsEnum,IsOptional,IsString,Matches,MinLength } from 'class-validator';
export class UpdateBusinessDto{@IsOptional()@IsString()name?:string;@IsOptional()@IsString()business_type?:string;@IsOptional()@IsString()rut_business?:string;@IsOptional()@IsString()address?:string;@IsOptional()@IsString()region?:string;@IsOptional()@IsString()commune?:string;@IsOptional()@Matches(/^\+569\d{8}$/)phone?:string;@IsOptional()@IsEmail()email?:string;@IsOptional()@IsString()logo_url?:string}
export class CreateCollaboratorDto{@IsString()@MinLength(2)name!:string;@IsEmail()email!:string;@IsEnum(UserRole)role!:UserRole;@IsOptional()@IsString()@MinLength(8)password?:string}
export class UpdateCollaboratorDto{@IsOptional()@IsEnum(UserRole)role?:UserRole;@IsOptional()@IsString()status?:'ACTIVE'|'INACTIVE'}
export class BillingRequestDto{@IsString()@MinLength(5)reason!:string;@IsOptional()@IsString()requested_plan_id?:string}
