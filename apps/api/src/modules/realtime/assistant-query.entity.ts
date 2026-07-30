import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** One row per 591 Assistant question — feeds the admin analytics counters (FR-12.1). */
@Entity('assistant_queries')
export class AssistantQuery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  @Column({ length: 300 })
  question: string;

  @Index()
  @Column({ length: 30 })
  intent: string;

  /** true when the bot answered without needing a human (not the fallback intent). */
  @Column({ type: 'boolean' })
  resolved: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
