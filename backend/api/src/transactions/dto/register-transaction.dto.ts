import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
export class RegisterTransactionDto { @IsString() business_id!: string; @IsString() customer_user_id!: string; @IsOptional() @IsNumber() @IsPositive() value?: number; @IsOptional() @IsNumber() @IsPositive() amount?: number; }
