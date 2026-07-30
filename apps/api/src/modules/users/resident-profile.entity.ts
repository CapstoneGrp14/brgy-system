import { VerificationStatus } from '@brgy/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CensusRecord } from '../masterlist/census-record.entity';
import { User } from './user.entity';

@Entity('resident_profiles')
export class ResidentProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.residentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'varchar', length: 36, unique: true })
  userId: string;

  @ManyToOne(() => CensusRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'census_record_id' })
  censusRecord: CensusRecord | null;

  @Column({ name: 'census_record_id', type: 'varchar', length: 36, nullable: true })
  censusRecordId: string | null;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  purok: string | null;

  @Column({ type: 'date', nullable: true })
  birthdate: string | null;

  @Column({ name: 'civil_status', type: 'varchar', length: 30, nullable: true })
  civilStatus: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
