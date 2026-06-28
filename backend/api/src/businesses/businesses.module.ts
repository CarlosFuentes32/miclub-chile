import { Module } from '@nestjs/common';
import { BusinessAccessService } from './business-access.service';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
@Module({ controllers: [BusinessesController], providers: [BusinessAccessService, BusinessesService], exports: [BusinessAccessService, BusinessesService] })
export class BusinessesModule {}
