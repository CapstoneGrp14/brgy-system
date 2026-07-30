import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A barangay-uploaded .docx template for a document type. Placeholders like
 * {resident_name} are filled at issuance and the result is converted to PDF.
 * At most one template per document type is active.
 */
@Entity('document_templates')
export class DocumentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** DOCUMENT_TYPES key, e.g. BARANGAY_CLEARANCE. */
  @Index()
  @Column({ name: 'document_type', type: 'varchar', length: 60 })
  documentType: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  /** Object key in the uploads bucket. */
  @Column({ name: 'storage_key', type: 'varchar', length: 255 })
  storageKey: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({ name: 'uploaded_by', type: 'varchar', length: 120 })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
