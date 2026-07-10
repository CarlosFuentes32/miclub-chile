import { IsString,MinLength } from 'class-validator';
export class RequestPasswordResetDto{@IsString()@MinLength(3)identifier!:string}
export class ConfirmPasswordResetDto{@IsString()@MinLength(20)token!:string;@IsString()@MinLength(8)password!:string}
