import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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

  @OneToMany(() => CensusRecord, (r) => r.household)
  members?: CensusRecord[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
