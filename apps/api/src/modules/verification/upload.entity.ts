import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** A file stored in MinIO (identity documents, evidence, print files…). */
@Entity('uploads')
export class Upload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  bucket: string;

  @Column({ name: 'object_key', type: 'varchar', length: 255 })
  objectKey: string;

  @Column({ type: 'varchar', length: 100 })
  mime: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Index()
  @Column({ name: 'uploader_id', type: 'varchar', length: 36 })
  uploaderId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
