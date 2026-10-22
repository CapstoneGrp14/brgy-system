import { Module } from '@nestjs/common';
import { MasterlistModule } from '../masterlist/masterlist.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResidentProfile } from '../users/resident-profile.entity';
import { BookingSlot } from './booking-slot.entity';
import { Booking } from './booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Facility } from './facility.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Facility, BookingSlot, ResidentProfile]), MasterlistModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
