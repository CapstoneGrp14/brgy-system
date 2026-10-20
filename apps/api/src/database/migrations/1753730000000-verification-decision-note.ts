import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Staff must record why a verification was approved or rejected.
 *
 * Rejections previously sent the resident a generic "common reasons" email, so
 * they had to guess what to fix. The note is surfaced to them, and it gives the
 * audit log a reason alongside the existing actor and timestamp.
 */
export class VerificationDecisionNote1753730000000 implements MigrationInterface {
  name = 'VerificationDecisionNote1753730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE verification_submissions
      ADD COLUMN decision_note VARCHAR(500) NULL AFTER decided_at
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE verification_submissions DROP COLUMN decision_note
    `);
  }
}
