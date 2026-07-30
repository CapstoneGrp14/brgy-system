import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('sos_alerts')
export class SosAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  lat: string | null;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  lng: string | null;

  @Column('float', { nullable: true })
  accuracy: number | null;

  @Index()
  @Column({ type: 'enum', enum: ['ACTIVE', 'RESOLVED'], default: 'ACTIVE' })
  status: 'ACTIVE' | 'RESOLVED';

  @Column({ name: 'resolved_by', type: 'varchar', length: 120, nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
