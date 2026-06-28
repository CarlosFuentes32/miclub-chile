import { IsDateString, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @Matches(/^\+?[0-9]{8,15}$/) phone!: string;
  @IsString() @MinLength(10) password!: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() rut?: string;
  @IsOptional() @IsString() businessSlug?: string;
}
