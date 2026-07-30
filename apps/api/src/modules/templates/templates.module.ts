import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocTypesService } from './doc-types.service';
import { DocumentTemplate } from './document-template.entity';
import { DocumentTypeSetting } from './document-type-setting.entity';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentTemplate, DocumentTypeSetting])],
  controllers: [TemplatesController],
  providers: [DocTypesService],
  exports: [DocTypesService],
})
export class TemplatesModule {}
