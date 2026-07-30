import { MigrationInterface, QueryRunner } from 'typeorm';

export class Verification1753570000000 implements MigrationInterface {
  name = 'Verification1753570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE uploads (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        bucket VARCHAR(60) NOT NULL,
        object_key VARCHAR(255) NOT NULL,
        mime VARCHAR(100) NOT NULL,
        size INT NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        uploader_id VARCHAR(36) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_uploads_uploader (uploader_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE verification_submissions (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        doc_type VARCHAR(40) NOT NULL,
        upload_id VARCHAR(36) NOT NULL,
        ocr_text TEXT NULL,
        match_score INT NULL,
        ocr_verdict VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        decided_by VARCHAR(120) NULL,
        decided_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_verification_user (user_id),
        INDEX idx_verification_status (status),
        CONSTRAINT fk_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_verification_upload FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE verification_submissions`);
    await queryRunner.query(`DROP TABLE uploads`);
  }
}
