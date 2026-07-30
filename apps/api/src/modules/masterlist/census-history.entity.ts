import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Snapshot of a census record's PREVIOUS values, written whenever a census
 * refresh (or deactivation) changes it — powers the masterlist history view.
 */
@Entity('census_record_history')
export class CensusRecordHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Index()
  @Column({ name: 'census_record_id', type: 'varchar', length: 36 })
  censusRecordId: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  purok: string | null;

  @Column({ type: 'varchar', length: 20 })
  category: string;

  @Column({ name: 'lgu_eligibility', type: 'varchar', length: 60, nullable: true })
  lguEligibility: string | null;

  @Column({ name: 'household_code', type: 'varchar', length: 20, nullable: true })
  householdCode: string | null;

  @Column({ name: 'was_active', type: 'boolean', default: true })
  wasActive: boolean;

  /** e.g. "Updated by Census Refresh", "Deactivated — missing from census refresh". */
  @Column({ type: 'varchar', length: 120 })
  note: string;

  @Column({ name: 'changed_by', type: 'varchar', length: 120 })
  changedBy: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
