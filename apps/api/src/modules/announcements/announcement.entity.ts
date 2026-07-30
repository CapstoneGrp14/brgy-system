import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** 🚨 Urgent-Evacuation mode (admin broadcast center only). */
  @Column({ type: 'boolean', default: false })
  urgent: boolean;

  /** Shows on resident dashboards + the announcements feed banner. */
  @Column({ name: 'channel_banner', type: 'boolean', default: true })
  channelBanner: boolean;

  /** Emailed to every active resident via the worker fan-out. */
  @Column({ name: 'channel_email', type: 'boolean', default: false })
  channelEmail: boolean;

  /** Optional dashboard banner photo (MinIO `uploads` bucket). */
  @Column({ name: 'photo_key', type: 'varchar', length: 255, nullable: true })
  photoKey: string | null;

  @Column({ name: 'author_id', type: 'varchar', length: 36 })
  authorId: string;

  /** e.g. "Adrian O. Perlas — Punong Barangay". */
  @Column({ name: 'author_label', type: 'varchar', length: 160 })
  authorLabel: string;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
