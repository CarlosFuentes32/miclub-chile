import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateLeadDto {
  @IsString() @MinLength(2) @MaxLength(120)
  name!: string;

  @Matches(/^\+569\d{8}$/)
  phone!: string;

  @IsEmail() @MaxLength(160)
  email!: string;

  @IsString() @MinLength(2) @MaxLength(140)
  business!: string;

  @IsString() @MinLength(2) @MaxLength(100)
  industry!: string;

  @IsString() @MinLength(5) @MaxLength(1000)
  message!: string;

  @IsOptional() @IsString() @MaxLength(60)
  source?: string;
}
