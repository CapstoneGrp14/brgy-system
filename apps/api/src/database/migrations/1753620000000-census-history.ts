import { MigrationInterface, QueryRunner } from 'typeorm';

export class CensusHistory1753620000000 implements MigrationInterface {
  name = 'CensusHistory1753620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE census_record_history (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        census_record_id VARCHAR(36) NOT NULL,
        address VARCHAR(255) NOT NULL,
        purok VARCHAR(40) NULL,
        category VARCHAR(20) NOT NULL,
        lgu_eligibility VARCHAR(60) NULL,
        household_code VARCHAR(20) NULL,
        was_active TINYINT NOT NULL DEFAULT 1,
        note VARCHAR(120) NOT NULL,
        changed_by VARCHAR(120) NOT NULL,
        changed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_census_history_record (census_record_id),
        CONSTRAINT fk_census_history_record FOREIGN KEY (census_record_id)
          REFERENCES census_records(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE census_record_history`);
  }
}
