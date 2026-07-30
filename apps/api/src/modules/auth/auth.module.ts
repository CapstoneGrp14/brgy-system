import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CensusRecord } from '../masterlist/census-record.entity';
import { ResidentProfile } from '../users/resident-profile.entity';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RefreshToken } from './refresh-token.entity';
import { StaffController } from './staff.controller';
import { StaffInvite } from './staff-invite.entity';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([User, ResidentProfile, CensusRecord, RefreshToken, StaffInvite]),
  ],
  controllers: [AuthController, StaffController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
