import { CensusCategory } from '@brgy/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Household } from './household.entity';

/**
 * The Barangay Census masterlist — the authoritative resident registry used
 * for OCR cross-checking (Phase 3), queue priority, and LGU pension
 * eligibility tracking. Holds no financial/disbursement data by design.
 */
@Entity('census_records')
export class CensusRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  purok: string | null;

  @Column({ type: 'enum', enum: CensusCategory, default: CensusCategory.REGULAR })
  category: CensusCategory;

  @Column({ name: 'lgu_eligibility', type: 'varchar', length: 60, nullable: true })
  lguEligibility: string | null;

  @Column({ type: 'date', nullable: true })
  birthdate: string | null;

  @ManyToOne(() => Household, (h) => h.members, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'household_id' })
  household: Household | null;

  @Index()
  @Column({ name: 'household_id', type: 'varchar', length: 36, nullable: true })
  householdId: string | null;

  /** False = not in the latest census refresh (moved away / deceased). Never deleted. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_synced_at', type: 'datetime', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
