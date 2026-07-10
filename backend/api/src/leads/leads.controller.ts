import { Body, Controller, Post } from "@nestjs/common";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { LeadsService } from "./leads.service";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  async create(@Body() dto: CreateLeadDto) {
    const lead = await this.leads.create(dto);
    return {
      lead_id: lead.id,
      status: lead.status,
      message: "Solicitud recibida correctamente. Te contactaremos a la brevedad.",
    };
  }
}
