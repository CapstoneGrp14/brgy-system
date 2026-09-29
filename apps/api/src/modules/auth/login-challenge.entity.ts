import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * One row per pending two-factor sign-in. Created once the password checks out
 * and deleted the moment the code is used, expires, or is superseded — so a
 * verified code can never be replayed. The code itself is never stored, only a
 * keyed HMAC of it, so a database dump cannot reveal live codes.
 */
@Entity('login_challenges')
export class LoginChallenge {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ name: 'code_hash', type: 'char', length: 64 })
  codeHash: string;

  /** Carried through the challenge so the refresh cookie matches the choice. */
  @Column({ name: 'remember_me', type: 'boolean', default: true })
  rememberMe: boolean;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'sends', type: 'int', default: 1 })
  sends: number;

  @Column({ name: 'last_sent_at', type: 'datetime' })
  lastSentAt: Date;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
