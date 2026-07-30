import { MigrationInterface, QueryRunner } from 'typeorm';

export class StaffPositions1753610000000 implements MigrationInterface {
  name = 'StaffPositions1753610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN position VARCHAR(60) NULL`);
    await queryRunner.query(`ALTER TABLE staff_invites ADD COLUMN position VARCHAR(60) NULL`);
    // Seed accounts: the demo chairman signs documents; William acts as secretary.
    await queryRunner.query(
      `UPDATE users SET position = 'Punong Barangay (Chairman)' WHERE email = 'chairman@brgy591.gov.ph'`,
    );
    await queryRunner.query(
      `UPDATE users SET position = 'Barangay Secretary' WHERE email = 'w.castro@brgy591.gov.ph'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE staff_invites DROP COLUMN position`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN position`);
  }
}
