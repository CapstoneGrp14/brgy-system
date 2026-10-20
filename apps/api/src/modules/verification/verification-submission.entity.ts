import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { OcrFieldResult } from '@brgy/shared';
import { User } from '../users/user.entity';
import { Upload } from './upload.entity';

export type OcrVerdict = 'PENDING' | 'MATCH' | 'PARTIAL' | 'NO_MATCH' | 'MANUAL' | 'ERROR';
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** One identity-document submission for OCR cross-check + staff approval (FR-2). */
@Entity('verification_submissions')
export class VerificationSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  /** VOTERS_ID | PROOF_OF_BILLING | UMID_NATIONAL_ID */
  @Column({ name: 'doc_type', type: 'varchar', length: 40 })
  docType: string;

  @ManyToOne(() => Upload, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'upload_id' })
  upload: Upload;

  @Column({ name: 'upload_id', type: 'varchar', length: 36 })
  uploadId: string;

  @Column({ name: 'ocr_text', type: 'text', nullable: true })
  ocrText: string | null;

  /** 0–100 census cross-check score. */
  @Column({ name: 'match_score', type: 'int', nullable: true })
  matchScore: number | null;

  /** Per-field checklist behind the score. Null for PDFs and older rows. */
  @Column({ name: 'ocr_fields', type: 'json', nullable: true })
  ocrFields: OcrFieldResult[] | null;

  @Column({ name: 'ocr_verdict', type: 'varchar', length: 20, default: 'PENDING' })
  ocrVerdict: OcrVerdict;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: SubmissionStatus;

  @Column({ name: 'decided_by', type: 'varchar', length: 120, nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_at', type: 'datetime', nullable: true })
  decidedAt: Date | null;

  /**
   * Why the decision was made. Required from staff at decision time — a
   * rejection reason is shown to the resident so they know what to fix, and
   * both outcomes carry it into the audit log.
   */
  @Column({ name: 'decision_note', type: 'varchar', length: 500, nullable: true })
  decisionNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
