import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { RealtimeGateway } from './realtime.gateway';

export interface ChatMessageView {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage) private readonly messages: Repository<ChatMessage>,
    private readonly gateway: RealtimeGateway,
  ) {}

  private toView(m: ChatMessage): ChatMessageView {
    return {
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    };
  }

  async history(): Promise<ChatMessageView[]> {
    const rows = await this.messages.find({ order: { createdAt: 'DESC' }, take: 50 });
    return rows.reverse().map((m) => this.toView(m));
  }

  async send(
    sender: { id: string; fullName: string; role: string },
    body: string,
  ): Promise<ChatMessageView> {
    const text = body.trim();
    if (!text) throw new BadRequestException('Message is empty.');
    if (text.length > 500) throw new BadRequestException('Message is too long (max 500 chars).');
    const saved = await this.messages.save(
      this.messages.create({
        senderId: sender.id,
        senderName: sender.fullName,
        senderRole: sender.role,
        body: text,
      }),
    );
    const view = this.toView(saved);
    this.gateway.emitToStaff('chat:new', view);
    return view;
  }
}
