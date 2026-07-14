import { Global, Module } from "@nestjs/common";
import { IncidentsModule } from "../incidents/incidents.module";
import { RequestContextMiddleware, RequestContextService } from "./request-context.service";
import { StructuredLoggerService } from "./structured-logger.service";
import { EnterpriseExceptionFilter } from "./enterprise-exception.filter";

@Global()
@Module({
  imports: [IncidentsModule],
  providers: [
    RequestContextService,
    RequestContextMiddleware,
    StructuredLoggerService,
    EnterpriseExceptionFilter,
  ],
  exports: [
    RequestContextService,
    RequestContextMiddleware,
    StructuredLoggerService,
    EnterpriseExceptionFilter,
  ],
})
export class EnterpriseLoggingModule {}
