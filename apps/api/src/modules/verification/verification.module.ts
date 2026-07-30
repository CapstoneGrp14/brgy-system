import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResidentProfile } from '../users/resident-profile.entity';
import { Upload } from './upload.entity';
import { VerificationDocType } from './verification-doc-type.entity';
import { VerificationSubmission } from './verification-submission.entity';
import { VerificationController } from './verification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationSubmission, Upload, VerificationDocType, ResidentProfile]),
  ],
  controllers: [VerificationController],
})
export class VerificationModule {}
