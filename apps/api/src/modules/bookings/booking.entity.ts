import { BookingStatus } from '@brgy/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Facility } from './facility.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Facility, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @Index()
  @Column({ name: 'facility_id', type: 'varchar', length: 36 })
  facilityId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  /** Minor this booking is for, when a head of family reserved on their behalf. */
  @Column({ name: 'beneficiary_census_record_id', type: 'varchar', length: 36, nullable: true })
  beneficiaryCensusRecordId: string | null;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  purpose: string | null;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'time_slot', type: 'varchar', length: 12 })
  timeSlot: string;

  @Index()
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ name: 'decided_by', type: 'varchar', length: 120, nullable: true })
  decidedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
