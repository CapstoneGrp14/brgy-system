import { RequestStatus } from '@brgy/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceRequest } from './service-request.entity';

/** Status-change history for a ServiceRequest. */
@Entity('request_events')
export class RequestEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => ServiceRequest, (r) => r.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: ServiceRequest;

  @Index()
  @Column({ name: 'request_id', type: 'varchar', length: 36 })
  requestId: string;

  @Column({ name: 'actor_label', type: 'varchar', length: 120 })
  actorLabel: string;

  @Column({ name: 'from_status', type: 'enum', enum: RequestStatus, nullable: true })
  fromStatus: RequestStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: RequestStatus })
  toStatus: RequestStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'at' })
  at: Date;
}
