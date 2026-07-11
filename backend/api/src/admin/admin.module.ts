import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ObservabilityModule } from '../observability/observability.module';

@Module({ imports: [EmailModule, ObservabilityModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
