import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Admin-configurable bookable time slot; off-peak slots are preferred by the resolver. */
@Entity('booking_slots')
export class BookingSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 12, unique: true })
  label: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ name: 'is_off_peak', type: 'boolean', default: false })
  isOffPeak: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
