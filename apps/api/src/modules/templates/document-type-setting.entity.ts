import { ReleaseMode } from '@brgy/shared';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Per-document-type configuration. For the five built-in types this only
 * carries the release mode; rows with `isCustom` are staff-added document
 * types residents can request (label + SLA live here too). PICKUP types are
 * printed by staff and released at the hall. Missing row = DIGITAL.
 */
@Entity('document_type_settings')
export class DocumentTypeSetting {
  @PrimaryColumn({ name: 'document_type', type: 'varchar', length: 60 })
  documentType: string;

  /** Only set for custom types (built-ins keep their labels in @brgy/shared). */
  @Column({ name: 'label_text', type: 'varchar', length: 120, nullable: true })
  labelText: string | null;

  @Column({ name: 'sla_class', type: 'varchar', length: 20, nullable: true })
  slaClass: string | null;

  @Column({ name: 'is_custom', type: 'boolean', default: false })
  isCustom: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'release_mode', type: 'enum', enum: ReleaseMode, default: ReleaseMode.DIGITAL })
  releaseMode: ReleaseMode;

  @Column({ name: 'updated_by', type: 'varchar', length: 120 })
  updatedBy: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
