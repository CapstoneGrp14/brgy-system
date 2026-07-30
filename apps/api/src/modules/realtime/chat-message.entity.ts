import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Internal staff channel messages (FR-10.2). */
@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'sender_name', length: 120 })
  senderName: string;

  @Column({ name: 'sender_role', length: 20 })
  senderRole: string;

  @Column({ length: 500 })
  body: string;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
