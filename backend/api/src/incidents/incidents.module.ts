import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { ObservabilityModule } from "../observability/observability.module";
import { AdminIncidentsController, AdminMonitoringController, MonitoringController } from "./incidents.controller";
import { IncidentsService } from "./incidents.service";

@Module({
  imports: [EmailModule, ObservabilityModule],
  controllers: [AdminIncidentsController, AdminMonitoringController, MonitoringController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
