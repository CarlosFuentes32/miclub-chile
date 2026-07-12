import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Request, Response } from "express";
import { IncidentSeverity } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { IncidentsService } from "../incidents/incidents.service";
import { RequestContextService } from "./request-context.service";
import { sanitizeText } from "./sensitive-data";

@Catch()
@Injectable()
export class EnterpriseExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly audit: AuditService,
    private readonly incidents: IncidentsService,
    private readonly context: RequestContextService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = this.context.requestId() ?? response.getHeader("X-Request-ID")?.toString() ?? RequestContextService.newId();
    const correlationId = this.context.correlationId() ?? response.getHeader("X-Correlation-ID")?.toString() ?? requestId;
    const publicMessage = status >= 500
      ? "No pudimos completar la operación."
      : this.safePublicMessage(exception);
    const error = await this.audit.recordSystemError({
      error: exception,
      module: this.moduleFromPath(request.originalUrl ?? request.url),
      endpoint: request.originalUrl ?? request.url,
      method: request.method,
      statusCode: status,
      metadata: { requestId, correlationId },
    });
    await this.audit.create({
      userId: (request as Request & { user?: { id?: string } }).user?.id,
      action: status === HttpStatus.FORBIDDEN || status === HttpStatus.UNAUTHORIZED ? "access_denied" : "request_failed",
      entityType: "http_request",
      entityId: requestId,
      result: status === HttpStatus.FORBIDDEN || status === HttpStatus.UNAUTHORIZED ? "denied" : "failure",
      riskLevel: status >= 500 ? "high" : "medium",
      statusCode: status,
      metadata: { errorId: error.id, path: request.originalUrl ?? request.url },
    }).catch(() => undefined);

    if (status >= 500 && error.occurrenceCount >= 3) {
      await this.incidents.createOrUpdateIncident({
        service: "api-errors",
        title: "Errores 5xx repetidos en API",
        severity: error.occurrenceCount >= 10 ? IncidentSeverity.CRITICAL : IncidentSeverity.HIGH,
        summary: `Error deduplicado ${error.fingerprint.slice(0, 12)} acumula ${error.occurrenceCount} ocurrencias`,
        technicalDetail: sanitizeText(error.message),
        source: "error-deduplication",
        metadata: { errorId: error.id, fingerprint: error.fingerprint, endpoint: error.endpoint },
      }).catch(() => undefined);
    }

    response
      .status(status)
      .setHeader("X-Request-ID", requestId)
      .setHeader("X-Correlation-ID", correlationId)
      .json({
        statusCode: status,
        message: publicMessage,
        requestId,
        correlationId,
        timestamp: new Date().toISOString(),
      });
  }

  private safePublicMessage(exception: unknown) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "string") return sanitizeText(response, 300) ?? "No pudimos completar la operación.";
      if (response && typeof response === "object" && "message" in response) {
        const message = (response as { message?: string | string[] }).message;
        return Array.isArray(message) ? message.map((item) => sanitizeText(item, 200)).filter(Boolean) : sanitizeText(message, 300);
      }
    }
    return "No pudimos completar la operación.";
  }

  private moduleFromPath(path: string) {
    const clean = path.replace(/^\/api\//, "").split("?")[0];
    return clean.split("/")[0] || "api";
  }
}

