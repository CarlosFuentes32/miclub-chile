import { UserRole } from '@prisma/client';import { IsEmail,IsEnum,IsOptional,IsString,MinLength } from 'class-validator';
export class UpdateBusinessDto{@IsOptional()@IsString()name?:string;@IsOptional()@IsString()business_type?:string;@IsOptional()@IsString()rut_business?:string;@IsOptional()@IsString()address?:string;@IsOptional()@IsString()phone?:string;@IsOptional()@IsEmail()email?:string;@IsOptional()@IsString()logo_url?:string}
export class CreateCollaboratorDto{@IsString()@MinLength(2)name!:string;@IsEmail()email!:string;@IsEnum(UserRole)role!:UserRole}
export class UpdateCollaboratorDto{@IsOptional()@IsEnum(UserRole)role?:UserRole;@IsOptional()@IsString()status?:'ACTIVE'|'INACTIVE'}
