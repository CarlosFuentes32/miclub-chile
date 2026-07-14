import { Injectable, NestMiddleware } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export interface RequestContextStore {
  requestId: string;
  correlationId: string;
  startedAt: number;
  request: Request & { user?: { id?: string; role?: string; businessId?: string; email?: string } };
}

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run(store: RequestContextStore, next: () => void) {
    this.storage.run(store, next);
  }

  get() {
    return this.storage.getStore();
  }

  requestId() {
    return this.get()?.requestId;
  }

  correlationId() {
    return this.get()?.correlationId;
  }

  durationMs() {
    const startedAt = this.get()?.startedAt;
    return startedAt ? Date.now() - startedAt : undefined;
  }

  static safeIncomingId(value: unknown) {
    const raw = Array.isArray(value) ? value[0] : value;
    return typeof raw === "string" && SAFE_ID.test(raw) ? raw : undefined;
  }

  static newId() {
    return randomUUID();
  }
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly context: RequestContextService) {}

  use(request: Request, response: Response, next: NextFunction) {
    const requestId =
      RequestContextService.safeIncomingId(request.header("x-request-id")) ??
      RequestContextService.newId();
    const correlationId =
      RequestContextService.safeIncomingId(request.header("x-correlation-id")) ??
      requestId;
    response.setHeader("X-Request-ID", requestId);
    response.setHeader("X-Correlation-ID", correlationId);
    this.context.run({ requestId, correlationId, startedAt: Date.now(), request: request as RequestContextStore["request"] }, next);
  }
}

