import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthUsers1753510000000 implements MigrationInterface {
  name = 'AuthUsers1753510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE census_records (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        full_name VARCHAR(120) NOT NULL,
        address VARCHAR(255) NOT NULL,
        purok VARCHAR(40) NULL,
        category ENUM('REGULAR','SENIOR','PWD','SOLO_PARENT') NOT NULL DEFAULT 'REGULAR',
        lgu_eligibility VARCHAR(60) NULL,
        birthdate DATE NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        email VARCHAR(160) NOT NULL,
        phone VARCHAR(20) NULL,
        full_name VARCHAR(120) NOT NULL,
        password_hash VARCHAR(100) NOT NULL,
        role ENUM('RESIDENT','EMPLOYEE','ADMIN') NOT NULL DEFAULT 'RESIDENT',
        is_active TINYINT NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX uq_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE resident_profiles (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        census_record_id VARCHAR(36) NULL,
        verification_status ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
        address VARCHAR(255) NULL,
        purok VARCHAR(40) NULL,
        birthdate DATE NULL,
        civil_status VARCHAR(30) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX uq_resident_profiles_user (user_id),
        CONSTRAINT fk_resident_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_resident_profiles_census FOREIGN KEY (census_record_id) REFERENCES census_records(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        jti VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_refresh_tokens_user (user_id),
        CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        actor_label VARCHAR(120) NOT NULL,
        actor_id VARCHAR(36) NULL,
        action VARCHAR(120) NOT NULL,
        target VARCHAR(255) NULL,
        INDEX idx_audit_logs_at (at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE audit_logs`);
    await queryRunner.query(`DROP TABLE refresh_tokens`);
    await queryRunner.query(`DROP TABLE resident_profiles`);
    await queryRunner.query(`DROP TABLE users`);
    await queryRunner.query(`DROP TABLE census_records`);
  }
}
