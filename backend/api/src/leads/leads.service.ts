import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLeadDto } from "./dto/create-lead.dto";

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateLeadDto) {
    return this.prisma.commercialLead.create({
      data: {
        name: dto.name.trim(),
        phone: dto.phone,
        email: dto.email.trim().toLowerCase(),
        business: dto.business.trim(),
        industry: dto.industry.trim(),
        message: dto.message.trim(),
        source: dto.source?.trim() || "landing",
      },
      select: { id: true, status: true, createdAt: true },
    });
  }
}
