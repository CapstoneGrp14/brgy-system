import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from './app-setting.entity';
import { CharterController } from './charter.controller';
import { CharterService } from './charter.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppSetting])],
  controllers: [CharterController],
  providers: [CharterService],
  exports: [CharterService],
})
export class CharterModule {}
