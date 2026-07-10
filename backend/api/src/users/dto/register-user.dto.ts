import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class RegisterUserDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/, {
    message: "El nombre solo puede contener letras y espacios",
  })
  name!: string;
  @IsEmail() email!: string;
  @IsString() @Matches(/^\+?[0-9]{8,15}$/) phone!: string;
  @IsString()
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  password!: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() rut?: string;
  @IsOptional() @IsString() businessSlug?: string;
}
