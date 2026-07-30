import { Role } from '@brgy/shared';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface SocketUser {
  id: string;
  fullName: string;
  role: Role;
}

/**
 * Single gateway for all live events. Handshake carries the access token in
 * `auth.token`; sockets join `user:<id>` and, for staff, the shared `staff` room.
 * Events emitted: `notify`, `sos:new`, `sos:update`, `sos:resolved`, `chat:new`.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('no token');
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
      });
      const user: SocketUser = { id: payload.sub, fullName: payload.name, role: payload.role };
      socket.data.user = user;
      await socket.join(`user:${user.id}`);
      if (user.role === Role.EMPLOYEE || user.role === Role.ADMIN) {
        await socket.join('staff');
      }
    } catch {
      socket.disconnect(true);
    }
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToStaff(event: string, payload: unknown): void {
    this.server?.to('staff').emit(event, payload);
  }

  emitAll(event: string, payload: unknown): void {
    this.server?.emit(event, payload);
  }
}
