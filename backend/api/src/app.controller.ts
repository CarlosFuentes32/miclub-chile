import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ObservabilityService } from "./observability/observability.service";

@Controller()
export class AppController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get("health")
  async health() {
    return this.observability.getEnterpriseHealth();
  }

  @Get("health/live")
  live() {
    return this.observability.getLiveness();
  }

  @Get("health/ready")
  async ready() {
    const readiness = await this.observability.getReadiness();
    if (readiness.status !== "ready") {
      throw new ServiceUnavailableException(readiness);
    }
    return readiness;
  }
}
