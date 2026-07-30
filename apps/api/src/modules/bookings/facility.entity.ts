import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A bookable facility or equipment item (seeded from the design's list). */
@Entity('facilities')
export class Facility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  name: string;

  @Column({ type: 'enum', enum: ['FACILITY', 'EQUIPMENT'], default: 'FACILITY' })
  type: 'FACILITY' | 'EQUIPMENT';

  /**
   * Recurring reserved slots, e.g. [{ slot: "10:00 AM", title: "Zumba Class" }].
   * Powers the design's demo conflict (Covered Court @ 10 AM).
   */
  @Column({ name: 'blocked_slots', type: 'json', nullable: true })
  blockedSlots: Array<{ slot: string; title: string }> | null;

  /** Disabled facilities are hidden from residents (existing bookings untouched). */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
