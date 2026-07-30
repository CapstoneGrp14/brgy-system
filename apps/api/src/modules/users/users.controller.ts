import { MeResponse, Role } from '@brgy/shared';
import { Controller, Get, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, RequestUser } from '../../common/decorators';
import { ResidentProfile } from './resident-profile.entity';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
  ) {}

  @Get('me')
  async me(@CurrentUser() current: RequestUser): Promise<MeResponse> {
    const user = await this.users.findOne({ where: { id: current.id } });
    if (!user) throw new NotFoundException('Account not found.');

    // Staff may also carry a resident profile (dual role).
    const profile = await this.profiles.findOne({ where: { userId: user.id } });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isResident: user.role === Role.RESIDENT || profile !== null,
      position: user.position,
      phone: user.phone,
      verificationStatus: profile?.verificationStatus,
      address: profile?.address ?? null,
      purok: profile?.purok ?? null,
      birthdate: profile?.birthdate ?? null,
      civilStatus: profile?.civilStatus ?? null,
    };
  }
}
