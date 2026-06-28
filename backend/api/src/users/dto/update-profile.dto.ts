import { IsDateString, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
export class UpdateProfileDto { @IsOptional() @IsString() @MinLength(2) name?:string; @IsOptional() @Matches(/^\+?[0-9]{8,15}$/) phone?:string; @IsOptional() @IsEmail() email?:string; @IsOptional() @IsDateString() birthDate?:string; @IsOptional() @IsString() rut?:string; }
