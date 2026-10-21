import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-staff module permissions.
 *
 * Barangay employees hold different offices, but every employee account saw the
 * same menu. An administrator can now withhold individual areas — a Lupon
 * member needs no SOS map, an SK chairperson no resident registry.
 *
 * NULL means unrestricted, which is how every existing account behaves, so this
 * changes nothing until an administrator makes a choice. An empty array is a
 * deliberate "dashboard only" and must stay distinct from NULL.
 */
export class StaffModulePermissions1753770000000 implements MigrationInterface {
  name = 'StaffModulePermissions1753770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN allowed_modules JSON NULL AFTER position
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN allowed_modules`);
  }
}
