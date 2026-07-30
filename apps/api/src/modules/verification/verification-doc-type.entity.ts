import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Admin-managed list of accepted supporting documents for verification. */
@Entity('verification_doc_types')
export class VerificationDocType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'label_text', type: 'varchar', length: 80 })
  labelText: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 120, default: 'System Default' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
