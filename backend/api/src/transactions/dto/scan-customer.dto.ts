import { IsString, MinLength } from 'class-validator';
export class ScanCustomerDto { @IsString() @MinLength(10) qr_token!: string; @IsString() business_id!: string; }
