import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { BillingWebhookController } from "./billing-webhook.controller";
import { ManualTransferProvider } from "./manual-transfer.provider";

@Module({
  imports: [PrismaModule],
  controllers: [BillingWebhookController],
  providers: [ManualTransferProvider],
  exports: [ManualTransferProvider],
})
export class BillingModule {}
