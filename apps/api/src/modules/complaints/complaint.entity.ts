import { ComplaintSource, ComplaintStatus } from '@brgy/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Upload } from '../verification/upload.entity';

/** A Katarungang Pambarangay case: resident-filed complaint or staff blotter entry. */
@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** e.g. "Antonette P. vs Delivery Co." or the blotter subject line. */
  @Column({ name: 'case_title', type: 'varchar', length: 160 })
  caseTitle: string;

  @Column({ type: 'varchar', length: 40 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'respondent_name', type: 'varchar', length: 120 })
  respondentName: string;

  /** Null for manual blotter entries encoded by staff. */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'complainant_id' })
  complainant: User | null;

  @Index()
  @Column({ name: 'complainant_id', type: 'varchar', length: 36, nullable: true })
  complainantId: string | null;

  @Column({ name: 'contact_number', type: 'varchar', length: 20, nullable: true })
  contactNumber: string | null;

  /** Identity hidden from the respondent/public but retained for traceability. */
  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  @ManyToOne(() => Upload, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'evidence_upload_id' })
  evidenceUpload: Upload | null;

  @Column({ name: 'evidence_upload_id', type: 'varchar', length: 36, nullable: true })
  evidenceUploadId: string | null;

  @Column({ type: 'enum', enum: ComplaintSource, default: ComplaintSource.RESIDENT_FORM })
  source: ComplaintSource;

  @Index()
  @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.FILED })
  status: ComplaintStatus;

  @Column({ name: 'lupon_assignee', type: 'varchar', length: 120, nullable: true })
  luponAssignee: string | null;

  /** 20-day Katarungang Pambarangay mediation deadline (null for staff blotter). */
  @Column({ name: 'mediation_due_at', type: 'datetime', nullable: true })
  mediationDueAt: Date | null;

  /** Set once by the sweeper when the mediation clock lapses (dedupes alerts). */
  @Column({ name: 'overdue_flagged', type: 'boolean', default: false })
  overdueFlagged: boolean;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'filed_at' })
  filedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
