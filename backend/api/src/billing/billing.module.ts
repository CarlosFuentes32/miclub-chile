import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { BillingWebhookController } from "./billing-webhook.controller";

@Module({
  imports: [PrismaModule],
  controllers: [BillingWebhookController],
})
export class BillingModule {}
