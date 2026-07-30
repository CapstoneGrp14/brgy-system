import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RequestUser } from '../../common/decorators';

interface AccessPayload {
  sub: string;
  email: string;
  name: string;
  role: RequestUser['role'];
  isResident?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
    });
  }

  validate(payload: AccessPayload): RequestUser {
    return {
      id: payload.sub,
      email: payload.email,
      fullName: payload.name,
      role: payload.role,
      isResident: payload.isResident ?? payload.role === 'RESIDENT',
    };
  }
}
