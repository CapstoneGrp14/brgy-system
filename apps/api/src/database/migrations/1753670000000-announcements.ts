import { MigrationInterface, QueryRunner } from 'typeorm';

export class Announcements1753670000000 implements MigrationInterface {
  name = 'Announcements1753670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE announcements (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        title VARCHAR(160) NOT NULL,
        body TEXT NOT NULL,
        urgent TINYINT(1) NOT NULL DEFAULT 0,
        channel_banner TINYINT(1) NOT NULL DEFAULT 1,
        channel_email TINYINT(1) NOT NULL DEFAULT 0,
        author_id VARCHAR(36) NOT NULL,
        author_label VARCHAR(160) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_announcements_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE announcements`);
  }
}
