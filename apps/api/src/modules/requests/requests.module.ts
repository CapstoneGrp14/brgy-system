import { Module } from '@nestjs/common';
import { CensusRecord } from '../masterlist/census-record.entity';
import { Household } from '../masterlist/household.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesModule } from '../templates/templates.module';
import { InventoryModule } from '../inventory/inventory.module';
import { DocumentTypeSetting } from '../templates/document-type-setting.entity';
import { ResidentProfile } from '../users/resident-profile.entity';
import { Upload } from '../verification/upload.entity';
import { RequestEvent } from './request-event.entity';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { ServiceRequest } from './service-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest, RequestEvent, ResidentProfile, DocumentTypeSetting, Upload, CensusRecord, Household]),
    InventoryModule,
    TemplatesModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
