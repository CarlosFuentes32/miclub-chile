import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("health")
  async health() {
    const startedAt = Date.now();
    let database: "ok" | "error" = "ok";
    let databaseLatencyMs: number | null = null;

    try {
      const dbStartedAt = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      databaseLatencyMs = Date.now() - dbStartedAt;
    } catch {
      database = "error";
    }

    return {
      status: database === "ok" ? "ok" : "degraded",
      service: "MiClub API",
      environment: process.env.NODE_ENV ?? "development",
      checks: {
        database,
        databaseLatencyMs,
      },
      responseTimeMs: Date.now() - startedAt,
      commit: process.env.GIT_COMMIT_SHA ?? process.env.RENDER_GIT_COMMIT ?? "unknown",
      timestamp: new Date().toISOString(),
    };
  }
}
