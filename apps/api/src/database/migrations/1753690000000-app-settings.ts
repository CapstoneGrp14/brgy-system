import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppSettings1753690000000 implements MigrationInterface {
  name = 'AppSettings1753690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE app_settings (
        setting_key VARCHAR(40) NOT NULL PRIMARY KEY,
        value JSON NOT NULL,
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // Charter content itself is seeded lazily by the service default so the
    // transcription lives in one place (charter-default.ts).
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE app_settings`);
  }
}
