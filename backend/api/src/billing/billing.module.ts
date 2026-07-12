import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminBillingWebhookTestController, BillingWebhookController } from "./billing-webhook.controller";
import { ManualTransferProvider } from "./manual-transfer.provider";

@Module({
  imports: [PrismaModule],
  controllers: [BillingWebhookController, AdminBillingWebhookTestController],
  providers: [ManualTransferProvider],
  exports: [ManualTransferProvider],
})
export class BillingModule {}
