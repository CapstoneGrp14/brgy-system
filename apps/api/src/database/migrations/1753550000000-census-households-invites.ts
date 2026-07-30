import { MigrationInterface, QueryRunner } from 'typeorm';

export class CensusHouseholdsInvites1753550000000 implements MigrationInterface {
  name = 'CensusHouseholdsInvites1753550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE households (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        code VARCHAR(20) NOT NULL,
        address VARCHAR(255) NOT NULL,
        purok VARCHAR(40) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX uq_households_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      ALTER TABLE census_records
        ADD COLUMN household_id VARCHAR(36) NULL,
        ADD INDEX idx_census_records_household (household_id),
        ADD CONSTRAINT fk_census_records_household
          FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL
    `);

    // One resident account per census person.
    await queryRunner.query(`
      ALTER TABLE resident_profiles
        ADD UNIQUE INDEX uq_resident_profiles_census (census_record_id)
    `);

    await queryRunner.query(`
      CREATE TABLE staff_invites (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        email VARCHAR(160) NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        role ENUM('RESIDENT','EMPLOYEE','ADMIN') NOT NULL,
        token_hash CHAR(64) NOT NULL,
        invited_by VARCHAR(120) NOT NULL,
        expires_at DATETIME NOT NULL,
        accepted_at DATETIME NULL,
        revoked_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_staff_invites_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE staff_invites`);
    await queryRunner.query(`ALTER TABLE resident_profiles DROP INDEX uq_resident_profiles_census`);
    await queryRunner.query(`ALTER TABLE census_records DROP FOREIGN KEY fk_census_records_household`);
    await queryRunner.query(`ALTER TABLE census_records DROP COLUMN household_id`);
    await queryRunner.query(`DROP TABLE households`);
  }
}
