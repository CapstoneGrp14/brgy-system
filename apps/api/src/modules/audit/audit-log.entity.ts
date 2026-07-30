import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Append-only system audit trail (FR-13). Never updated or deleted. */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @CreateDateColumn({ name: 'at' })
  @Index()
  at: Date;

  /** Display label: "Antonette Potolin (Resident)" or a system actor like "ARTA SLA Tracker". */
  @Column({ name: 'actor_label', type: 'varchar', length: 120 })
  actorLabel: string;

  @Column({ name: 'actor_id', type: 'varchar', length: 36, nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 120 })
  action: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  target: string | null;
}
