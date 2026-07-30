import { MigrationInterface, QueryRunner } from 'typeorm';

export class VerificationDocTypes1753580000000 implements MigrationInterface {
  name = 'VerificationDocTypes1753580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE verification_doc_types (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        label_text VARCHAR(80) NOT NULL,
        is_active TINYINT NOT NULL DEFAULT 1,
        created_by VARCHAR(120) NOT NULL DEFAULT 'System Default',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    for (const label of [
      'Birth Certificate (PSA)',
      'National ID (PhilSys)',
      'UMID',
      "Voter's ID / Barangay ID",
      'Proof of Billing',
    ]) {
      await queryRunner.query(
        `INSERT INTO verification_doc_types (id, label_text) VALUES (UUID(), ?)`,
        [label],
      );
    }
    // Custom labels can be longer than the old enum-style keys.
    await queryRunner.query(
      `ALTER TABLE verification_submissions MODIFY doc_type VARCHAR(80) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE verification_submissions MODIFY doc_type VARCHAR(40) NOT NULL`);
    await queryRunner.query(`DROP TABLE verification_doc_types`);
  }
}
