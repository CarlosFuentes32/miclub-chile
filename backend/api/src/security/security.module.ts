import { Global, Module } from "@nestjs/common";
import { CsrfOriginMiddleware, DistributedRateLimitMiddleware, SecurityHeadersMiddleware } from "./security.middleware";
import { DistributedRateLimitService } from "./rate-limit.service";

@Global()
@Module({
  providers: [
    DistributedRateLimitService,
    SecurityHeadersMiddleware,
    CsrfOriginMiddleware,
    DistributedRateLimitMiddleware,
  ],
  exports: [
    DistributedRateLimitService,
    SecurityHeadersMiddleware,
    CsrfOriginMiddleware,
    DistributedRateLimitMiddleware,
  ],
})
export class SecurityModule {}

