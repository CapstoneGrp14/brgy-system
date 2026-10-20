import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators';
import {
  AcceptInviteDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendTwoFactorDto,
  ResetPasswordDto,
  VerifyTwoFactorDto,
} from './auth.dto';
import { AuthService, REFRESH_COOKIE } from './auth.service';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.register(dto, res);
  }

  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.acceptInvite(dto, res);
  }

  // The emailed code is protected by its own attempt lockout, but the password
  // step had no ceiling — an attacker could guess indefinitely, and each attempt
  // that got the password right also sent a real email. 10/min per IP.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  /** Step 2 of sign-in — exchange the emailed code for a session. */
  @Post('login/verify')
  @HttpCode(200)
  verifyTwoFactor(@Body() dto: VerifyTwoFactorDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.verifyTwoFactor(dto, res);
  }

  @Post('login/resend')
  @HttpCode(200)
  resendTwoFactor(@Body() dto: ResendTwoFactorDto) {
    return this.auth.resendTwoFactor(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req.cookies?.[REFRESH_COOKIE], res);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req.cookies?.[REFRESH_COOKIE], res);
  }

  // Unthrottled this is an email cannon: each call sends real mail to an address
  // the caller chooses, so it can be used to flood a resident's inbox.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }
}
