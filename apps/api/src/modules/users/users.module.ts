import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResidentProfile } from './resident-profile.entity';
import { User } from './user.entity';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, ResidentProfile])],
  controllers: [UsersController],
})
export class UsersModule {}
