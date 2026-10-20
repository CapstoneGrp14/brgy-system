import type { OcrFieldSpec } from '@brgy/shared';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Admin-managed list of accepted supporting documents for verification. */
@Entity('verification_doc_types')
export class VerificationDocType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'label_text', type: 'varchar', length: 80 })
  labelText: string;

  /**
   * Which fields this document should carry and what each is worth. A driver's
   * licence shows a licence number; a PSA birth certificate does not — scoring
   * them against the same checklist is what made the old number meaningless.
   * Null falls back to DEFAULT_OCR_FIELDS.
   */
  @Column({ name: 'ocr_fields', type: 'json', nullable: true })
  ocrFields: OcrFieldSpec[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 120, default: 'System Default' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
