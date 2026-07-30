import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResidentProfile } from '../users/resident-profile.entity';
import { User } from '../users/user.entity';
import { CensusRecordHistory } from './census-history.entity';
import { CensusRecord } from './census-record.entity';
import { Household } from './household.entity';
import { MasterlistController } from './masterlist.controller';
import { MasterlistService } from './masterlist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CensusRecord, Household, ResidentProfile, CensusRecordHistory, User]),
  ],
  controllers: [MasterlistController],
  providers: [MasterlistService],
})
export class MasterlistModule {}
