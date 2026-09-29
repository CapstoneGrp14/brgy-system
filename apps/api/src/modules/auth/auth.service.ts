import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import {
  LoginResponse,
  LoginResult,
  Role,
  TWO_FACTOR_CODE_LENGTH,
  TwoFactorChallenge,
  VerificationStatus,
} from '@brgy/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { MailJob, MailService } from '../mail/mail.service';
import { CensusRecord } from '../masterlist/census-record.entity';
import { QUEUES, QueueService } from '../queue/queue.service';
import { ResidentProfile } from '../users/resident-profile.entity';
import { User } from '../users/user.entity';
import {
  AcceptInviteDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendTwoFactorDto,
  ResetPasswordDto,
  VerifyTwoFactorDto,
} from './auth.dto';
import { LoginChallenge } from './login-challenge.entity';
import { RefreshToken } from './refresh-token.entity';
import { StaffInvite } from './staff-invite.entity';

export const REFRESH_COOKIE = 'brgy_rt';

/** Two-factor sign-in limits — short-lived code, hard caps on guessing/resending. */
const CODE_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 4;

const roleLabel: Record<Role, string> = {
  [Role.RESIDENT]: 'Resident',
  [Role.EMPLOYEE]: 'Employee',
  [Role.ADMIN]: 'Admin',
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
    @InjectRepository(CensusRecord) private readonly census: Repository<CensusRecord>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(StaffInvite) private readonly invites: Repository<StaffInvite>,
    @InjectRepository(LoginChallenge) private readonly challenges: Repository<LoginChallenge>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly mail: MailService,
  ) {}

  private label(user: User): string {
    return `${user.fullName} (${roleLabel[user.role]})`;
  }

  private async toAuthUser(user: User): Promise<LoginResponse['user']> {
    // Any account may carry a resident profile — staff/officials who live in
    // the barangay are residents too (dual role, single email).
    const profile = await this.profiles.findOne({ where: { userId: user.id } });
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isResident: user.role === Role.RESIDENT || profile !== null,
      position: user.position,
      ...(profile ? { verificationStatus: profile.verificationStatus } : {}),
    };
  }

  private async issueTokens(
    user: User,
    res: Response,
    rememberMe: boolean,
  ): Promise<LoginResponse> {
    const authUser = await this.toAuthUser(user);
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        isResident: authUser.isResident,
      },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
        expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
      },
    );

    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti },
      {
        secret: this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
        expiresIn: this.config.get('JWT_REFRESH_TTL', '7d'),
      },
    );
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    await this.refreshTokens.insert({
      jti,
      userId: user.id,
      tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: new Date(Date.now() + sevenDaysMs),
    });

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      path: '/api/v1/auth',
      ...(rememberMe ? { maxAge: sevenDaysMs } : {}),
    });

    return { accessToken, user: authUser };
  }

  /**
   * Resident self-registration, gated on the Barangay Census (FR-1.3):
   * the name + birthdate must match an unclaimed census record and the
   * person must be at least 16. Address/purok come from the census.
   * The account still starts PENDING — ID upload + staff approval follow.
   */
  async register(dto: RegisterDto, res: Response): Promise<LoginResponse> {
    const existing = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('An account with this email already exists.');

    const censusMatch = await this.census
      .createQueryBuilder('c')
      .where('LOWER(TRIM(c.full_name)) = LOWER(:name)', { name: dto.fullName.trim() })
      .andWhere('c.birthdate = :birthdate', { birthdate: dto.birthdate })
      .andWhere('c.is_active = 1')
      .getOne();
    if (!censusMatch) {
      throw new UnprocessableEntityException(
        'We could not find you in the Barangay Census. Check that your name and birthdate match your census registration, or visit the Barangay Hall to be added.',
      );
    }

    const age = Math.floor(
      (Date.now() - new Date(dto.birthdate + 'T00:00').getTime()) / (365.25 * 24 * 3600 * 1000),
    );
    if (age < 16) {
      throw new UnprocessableEntityException(
        'You must be at least 16 years old to create an account. A parent or guardian can transact on your behalf.',
      );
    }

    const claimed = await this.profiles.findOne({ where: { censusRecordId: censusMatch.id } });
    if (claimed) {
      throw new ConflictException(
        'This census record is already linked to an account. If this is you, use Forgot Password — or contact the Barangay Hall.',
      );
    }

    const user = await this.users.save(
      this.users.create({
        email: dto.email.toLowerCase(),
        phone: dto.phone ?? null,
        fullName: censusMatch.fullName,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: Role.RESIDENT,
      }),
    );

    await this.profiles.save(
      this.profiles.create({
        userId: user.id,
        censusRecordId: censusMatch.id,
        verificationStatus: VerificationStatus.PENDING,
        address: censusMatch.address,
        purok: censusMatch.purok,
        birthdate: censusMatch.birthdate,
      }),
    );

    this.audit.log({
      actorLabel: this.label(user),
      actorId: user.id,
      action: 'Registered Account',
      target: `Census match: ${censusMatch.fullName}`,
    });

    return this.issueTokens(user, res, true);
  }

  /** Staff account creation via an admin-issued email invite. */
  async acceptInvite(dto: AcceptInviteDto, res: Response): Promise<LoginResponse> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const invite = await this.invites.findOne({ where: { tokenHash } });
    if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('This invitation is invalid, expired, or already used.');
    }

    const existing = await this.users.findOne({ where: { email: invite.email.toLowerCase() } });
    if (existing) throw new ConflictException('An account with this email already exists.');

    const user = await this.users.save(
      this.users.create({
        email: invite.email.toLowerCase(),
        phone: dto.phone ?? null,
        fullName: invite.fullName,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: invite.role,
        position: invite.position,
      }),
    );

    // Staff who are barangay residents: auto-link their unclaimed census
    // record so one email serves both portals (dual role).
    const censusMatch = await this.census
      .createQueryBuilder('c')
      .where('LOWER(TRIM(c.full_name)) = LOWER(:name)', { name: invite.fullName.trim() })
      .andWhere('c.is_active = 1')
      .getOne();
    if (censusMatch) {
      const claimed = await this.profiles.findOne({ where: { censusRecordId: censusMatch.id } });
      if (!claimed) {
        await this.profiles.save(
          this.profiles.create({
            userId: user.id,
            censusRecordId: censusMatch.id,
            verificationStatus: VerificationStatus.PENDING,
            address: censusMatch.address,
            purok: censusMatch.purok,
            birthdate: censusMatch.birthdate,
          }),
        );
      }
    }

    await this.invites.update({ id: invite.id }, { acceptedAt: new Date() });
    this.audit.log({
      actorLabel: this.label(user),
      actorId: user.id,
      action: 'Accepted Staff Invite',
      target: `Invited by ${invite.invitedBy}${censusMatch ? ' · census-linked (dual role)' : ''}`,
    });

    return this.issueTokens(user, res, true);
  }

  // ── Two-factor sign-in (emailed code) ─────────────────────────────────

  /** Off only when AUTH_2FA_ENABLED is explicitly set to "false" (local dev). */
  private get twoFactorEnabled(): boolean {
    return this.config.get<string>('AUTH_2FA_ENABLED', 'true') !== 'false';
  }

  /**
   * Keyed digest of the code. An HMAC rather than a plain hash so a leaked
   * table cannot be brute-forced offline (a 6-digit space is only a million
   * candidates) without also holding the server secret.
   */
  private hashCode(code: string): string {
    return createHmac('sha256', this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'))
      .update(code)
      .digest('hex');
  }

  /** "antonette@gmail.com" → "an*****te@gmail.com" — enough to recognise, not to learn. */
  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    const keep = name.length <= 4 ? 1 : 2;
    return `${name.slice(0, keep)}${'*'.repeat(Math.max(2, name.length - keep * 2))}${name.slice(-keep)}@${domain}`;
  }

  /**
   * Hand the code to the worker over RabbitMQ like every other outbound mail,
   * but fall back to sending in-process when the broker is unreachable — a
   * login code that never arrives locks the resident out of the portal.
   */
  private async sendMail(job: MailJob): Promise<void> {
    try {
      await this.queue.publish(QUEUES.email, job);
    } catch {
      await this.mail.send(job);
    }
  }

  private codeEmail(user: User, code: string): MailJob {
    const minutes = Math.round(CODE_TTL_SECONDS / 60);
    return {
      to: user.email,
      subject: `Barangay 591 — Your sign-in code is ${code}`,
      html: `
        <p>Hi ${user.fullName},</p>
        <p>Use this code to finish signing in to the Barangay 591 e-Services Portal:</p>
        <p style="font:800 32px 'Segoe UI',Arial,sans-serif;letter-spacing:8px;color:#1E3A5F;
                  background:#F0F4FA;border-radius:10px;padding:16px 20px;text-align:center;margin:18px 0;">
          ${code}
        </p>
        <p>The code expires in ${minutes} minutes and can be used once.</p>
        <p><strong>Didn't try to sign in?</strong> Someone may know your password — change it right away
        and tell the Barangay Hall.</p>`,
    };
  }

  /**
   * Issue (or re-issue) a login challenge and email the code. Any earlier
   * challenge for the account is dropped, so only the newest code works.
   */
  private async startTwoFactor(user: User, rememberMe: boolean): Promise<TwoFactorChallenge> {
    await this.challenges.delete({ userId: user.id });

    const code = String(randomInt(0, 10 ** TWO_FACTOR_CODE_LENGTH)).padStart(TWO_FACTOR_CODE_LENGTH, '0');
    const now = new Date();
    const challenge = await this.challenges.save(
      this.challenges.create({
        id: randomUUID(),
        userId: user.id,
        codeHash: this.hashCode(code),
        rememberMe,
        attempts: 0,
        sends: 1,
        lastSentAt: now,
        expiresAt: new Date(now.getTime() + CODE_TTL_SECONDS * 1000),
      }),
    );

    await this.sendMail(this.codeEmail(user, code));
    this.audit.log({
      actorLabel: this.label(user),
      actorId: user.id,
      action: 'Sign-in Code Sent',
      target: this.maskEmail(user.email),
    });

    return {
      twoFactorRequired: true,
      challengeId: challenge.id,
      maskedEmail: this.maskEmail(user.email),
      expiresInSeconds: CODE_TTL_SECONDS,
      resendAfterSeconds: RESEND_COOLDOWN_SECONDS,
    };
  }

  /**
   * A dead end for this challenge — the client should drop it and start over
   * at the password form. `restart` is what tells it to, instead of leaving the
   * resident staring at a code box that can no longer work.
   */
  private restartLogin(message: string): never {
    throw new UnauthorizedException({ statusCode: 401, error: 'Unauthorized', message, restart: true });
  }

  /** Loads a still-usable challenge, or explains why it cannot be used. */
  private async liveChallenge(challengeId: string): Promise<{ challenge: LoginChallenge; user: User }> {
    const challenge = await this.challenges.findOne({ where: { id: challengeId } });
    if (!challenge || challenge.expiresAt < new Date()) {
      this.restartLogin('This code has expired — please sign in again.');
    }
    const user = await this.users.findOne({ where: { id: challenge.userId } });
    if (!user || !user.isActive) {
      await this.challenges.delete({ id: challenge.id });
      this.restartLogin('Account unavailable.');
    }
    return { challenge, user };
  }

  /**
   * Step 1 of sign-in: check the password. With 2FA on, no session is created
   * yet — the caller gets a challenge and must post the emailed code to
   * /auth/login/verify.
   */
  async login(dto: LoginDto, res: Response): Promise<LoginResult> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    const passwordOk = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !passwordOk || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (this.twoFactorEnabled) return this.startTwoFactor(user, dto.rememberMe ?? true);

    this.audit.log({ actorLabel: this.label(user), actorId: user.id, action: 'Logged In' });
    return this.issueTokens(user, res, dto.rememberMe ?? true);
  }

  /** Step 2 of sign-in: exchange the emailed code for a session. */
  async verifyTwoFactor(dto: VerifyTwoFactorDto, res: Response): Promise<LoginResponse> {
    const { challenge, user } = await this.liveChallenge(dto.challengeId);

    const expected = Buffer.from(challenge.codeHash, 'hex');
    const given = Buffer.from(this.hashCode(dto.code), 'hex');
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      const attempts = challenge.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await this.challenges.delete({ id: challenge.id });
        this.audit.log({
          actorLabel: this.label(user),
          actorId: user.id,
          action: 'Sign-in Code Locked Out',
          target: `${MAX_ATTEMPTS} wrong codes`,
        });
        this.restartLogin('Too many incorrect codes — please sign in again.');
      }
      await this.challenges.update({ id: challenge.id }, { attempts });
      const left = MAX_ATTEMPTS - attempts;
      throw new UnauthorizedException(
        `That code is incorrect — ${left} ${left === 1 ? 'try' : 'tries'} left.`,
      );
    }

    // Single-use: delete rather than mark, so a replay finds nothing at all.
    await this.challenges.delete({ id: challenge.id });
    this.audit.log({
      actorLabel: this.label(user),
      actorId: user.id,
      action: 'Logged In',
      target: 'Two-factor code verified',
    });
    return this.issueTokens(user, res, challenge.rememberMe);
  }

  /** Email a fresh code for the same challenge, behind a cooldown + send cap. */
  async resendTwoFactor(dto: ResendTwoFactorDto): Promise<TwoFactorChallenge> {
    const { challenge, user } = await this.liveChallenge(dto.challengeId);

    const sinceLastSend = (Date.now() - challenge.lastSentAt.getTime()) / 1000;
    if (sinceLastSend < RESEND_COOLDOWN_SECONDS) {
      throw new BadRequestException(
        `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - sinceLastSend)}s before asking for another code.`,
      );
    }
    if (challenge.sends >= MAX_SENDS) {
      await this.challenges.delete({ id: challenge.id });
      this.restartLogin('Too many codes requested — please sign in again.');
    }

    // startTwoFactor() clears the old row, so the previous code stops working
    // and the resend cap carries over onto the new challenge.
    const next = await this.startTwoFactor(user, challenge.rememberMe);
    await this.challenges.update({ id: next.challengeId }, { sends: challenge.sends + 1 });
    return next;
  }

  async refresh(rawToken: string | undefined, res: Response): Promise<LoginResponse> {
    if (!rawToken) throw new UnauthorizedException('No session.');

    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(rawToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
      });
    } catch {
      throw new UnauthorizedException('Session expired — please sign in again.');
    }

    const row = await this.refreshTokens.findOne({ where: { jti: payload.jti } });
    const hash = createHash('sha256').update(rawToken).digest('hex');
    if (!row || row.revokedAt || row.expiresAt < new Date() || row.tokenHash !== hash) {
      // Reuse of a revoked token → revoke the whole family for this user.
      if (row?.revokedAt) {
        await this.refreshTokens.update({ userId: row.userId }, { revokedAt: new Date() });
      }
      throw new UnauthorizedException('Session expired — please sign in again.');
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account unavailable.');

    await this.refreshTokens.update({ jti: payload.jti }, { revokedAt: new Date() });
    return this.issueTokens(user, res, true);
  }

  async logout(rawToken: string | undefined, res: Response): Promise<{ ok: true }> {
    if (rawToken) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string; jti: string }>(rawToken, {
          secret: this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
        });
        await this.refreshTokens.update({ jti: payload.jti }, { revokedAt: new Date() });
        const user = await this.users.findOne({ where: { id: payload.sub } });
        if (user) this.audit.log({ actorLabel: this.label(user), actorId: user.id, action: 'Signed Out' });
      } catch {
        // expired/garbled token — nothing to revoke
      }
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ ok: true }> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (user) {
      const token = await this.jwt.signAsync(
        { sub: user.id, purpose: 'pwreset' },
        {
          secret: this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
          expiresIn: '30m',
        },
      );
      const webUrl = this.config.get('WEB_URL', 'http://localhost:5173');
      await this.queue.publish(QUEUES.email, {
        to: user.email,
        subject: 'Barangay 591 — Password Reset',
        html: `
          <p>Hi ${user.fullName},</p>
          <p>We received a request to reset your Barangay 591 e-Services password.
          This link is valid for 30 minutes:</p>
          <p><a href="${webUrl}/reset-password?token=${token}">Reset my password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>`,
      });
      this.audit.log({
        actorLabel: this.label(user),
        actorId: user.id,
        action: 'Requested Password Reset',
      });
    }
    // Same response either way — no account enumeration.
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ ok: true }> {
    let payload: { sub: string; purpose?: string };
    try {
      payload = await this.jwt.verifyAsync(dto.token, {
        secret: this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
      });
    } catch {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    if (payload.purpose !== 'pwreset') throw new BadRequestException('Invalid reset token.');

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) throw new BadRequestException('Account no longer exists.');

    await this.users.update({ id: user.id }, { passwordHash: await bcrypt.hash(dto.newPassword, 10) });
    await this.refreshTokens.update({ userId: user.id }, { revokedAt: new Date() });
    this.audit.log({ actorLabel: this.label(user), actorId: user.id, action: 'Reset Password' });
    return { ok: true };
  }
}
