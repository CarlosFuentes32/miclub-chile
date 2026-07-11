import { Controller, Get } from "@nestjs/common";
import { ObservabilityService } from "./observability/observability.service";

@Controller()
export class AppController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get("health")
  async health() {
    return this.observability.getEnterpriseHealth();
  }
}
