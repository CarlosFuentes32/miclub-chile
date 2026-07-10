import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      status: "ok",
      service: "MiClub API",
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
    };
  }
}
