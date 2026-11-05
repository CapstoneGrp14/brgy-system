import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

/** Per-resident SOS cooldown state. One row per user, created on first alert. */
@Entity('sos_throttle')
export class SosThrottle {
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** New alerts raised since `windowStartedAt`. Presses are not counted. */
  @Column({ name: 'alerts_in_window', type: 'int', default: 0 })
  alertsInWindow: number;

  /** 0 = clean, 1 = one lapse served, 2+ = on the strictest allowance. */
  @Column({ type: 'tinyint', default: 0 })
  tier: number;

  @Column({ name: 'window_started_at', type: 'datetime', nullable: true })
  windowStartedAt: Date | null;

  @Index()
  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'locked_reason', type: 'varchar', length: 160, nullable: true })
  lockedReason: string | null;

  /** Staff who lifted the most recent lock, for the audit trail. */
  @Column({ name: 'lifted_by', type: 'varchar', length: 120, nullable: true })
  liftedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
