import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

export class SupportAccessDto {
  @IsString() @MinLength(8) @MaxLength(500) reason!: string;
  @IsOptional() @IsString() ticketId?: string;
}

export class SupportSearchDto extends SupportAccessDto {
  @IsString() @MinLength(2) @MaxLength(120) q!: string;
}

export class CreateSupportTicketDto {
  @IsString() @MinLength(4) @MaxLength(160) title!: string;
  @IsString() @MinLength(8) @MaxLength(5000) description!: string;
  @IsEnum(SupportTicketCategory) category!: SupportTicketCategory;
  @IsEnum(SupportTicketPriority) priority!: SupportTicketPriority;
  @IsOptional() @IsString() businessId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() cashierUserId?: string;
  @IsOptional() @IsString() transactionId?: string;
  @IsOptional() @IsString() rewardId?: string;
  @IsOptional() @IsString() incidentId?: string;
  @IsOptional() @IsString() requestId?: string;
  @IsOptional() @IsString() correlationId?: string;
}

export class UpdateSupportTicketDto {
  @IsOptional() @IsEnum(SupportTicketStatus) status?: SupportTicketStatus;
  @IsOptional() @IsEnum(SupportTicketPriority) priority?: SupportTicketPriority;
  @IsOptional() @IsString() assignedAgentId?: string;
  @IsString() @MinLength(8) @MaxLength(500) reason!: string;
}

export class SupportNoteDto {
  @IsString() @MinLength(4) @MaxLength(4000) note!: string;
}

export class SupportToolDto extends SupportAccessDto {
  @IsOptional() @IsString() sessionId?: string;
}
