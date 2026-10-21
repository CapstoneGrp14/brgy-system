import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CensusRecord } from './census-record.entity';

/** A household groups census records living at one address (e.g. HH-0001). */
@Entity('households')
export class Household {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  purok: string | null;

  /**
   * Who the barangay transacts with for this household. The head may request
   * services for the minors living here, so this is an authority record, not
   * just a label.
   */
  @ManyToOne(() => CensusRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'head_census_record_id' })
  head?: CensusRecord | null;

  @Column({ name: 'head_census_record_id', type: 'varchar', length: 36, nullable: true })
  headCensusRecordId: string | null;

  @OneToMany(() => CensusRecord, (r) => r.household)
  members?: CensusRecord[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
