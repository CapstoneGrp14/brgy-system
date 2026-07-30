import { MigrationInterface, QueryRunner } from 'typeorm';

export class CensusLifecycle1753560000000 implements MigrationInterface {
  name = 'CensusLifecycle1753560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE census_records
        ADD COLUMN is_active TINYINT NOT NULL DEFAULT 1,
        ADD COLUMN last_synced_at DATETIME NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE census_records
        DROP COLUMN is_active,
        DROP COLUMN last_synced_at
    `);
  }
}
