import { MigrationInterface, QueryRunner } from 'typeorm';

/** Email-code two-factor authentication on sign-in. */
export class LoginTwoFactor1753720000000 implements MigrationInterface {
  name = 'LoginTwoFactor1753720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE login_challenges (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        remember_me TINYINT(1) NOT NULL DEFAULT 1,
        attempts INT NOT NULL DEFAULT 0,
        sends INT NOT NULL DEFAULT 1,
        last_sent_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_login_challenges_user (user_id),
        INDEX idx_login_challenges_expires (expires_at),
        CONSTRAINT fk_login_challenges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE login_challenges`);
  }
}
