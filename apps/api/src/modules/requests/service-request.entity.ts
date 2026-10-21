import { RequestStatus, RequestType, SlaClass } from '@brgy/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { RequestEvent } from './request-event.entity';

/**
 * One row per resident-facing request of any kind (documents, CCTV, medicine,
 * equipment, printing). A single table powers the unified staff queue, the
 * resident ARTA tracker, and the compliance reports.
 */
@Entity('service_requests')
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  /**
   * Who the document is FOR, when that is not the filer. Set only when a head
   * of family files on behalf of a minor in their household; null on every
   * ordinary request.
   */
  @Column({ name: 'beneficiary_census_record_id', type: 'varchar', length: 36, nullable: true })
  beneficiaryCensusRecordId: string | null;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'enum', enum: RequestType })
  type: RequestType;

  /** e.g. BARANGAY_CLEARANCE, CCTV_FOOTAGE, PARACETAMOL — type-specific key. */
  @Column({ type: 'varchar', length: 60 })
  subtype: string;

  /** Display title, e.g. "Barangay Clearance" or "Free Medicine — Paracetamol". */
  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purpose: string | null;

  @Column({ name: 'sla_class', type: 'enum', enum: SlaClass })
  slaClass: SlaClass;

  @Index()
  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @Index()
  @Column({ name: 'due_at', type: 'datetime' })
  dueAt: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  /** Type-specific extras (quantity, copies, incident datetime/location…). */
  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  /** MinIO object key of the generated document PDF, once issued. */
  @Column({ name: 'document_key', type: 'varchar', length: 255, nullable: true })
  documentKey: string | null;

  @OneToMany(() => RequestEvent, (e) => e.request)
  events?: RequestEvent[];

  @CreateDateColumn({ name: 'filed_at' })
  filedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
