import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';
import { BusinessAccessService } from './business-access.service';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
@Module({ imports: [EmailModule, AuditModule], controllers: [BusinessesController], providers: [BusinessAccessService, BusinessesService], exports: [BusinessAccessService, BusinessesService] })
export class BusinessesModule {}
