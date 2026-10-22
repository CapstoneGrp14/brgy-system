import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A marriage certificate is supporting evidence, not an identity document.
 *
 * It was previously offered as its own entry in the verification dropdown,
 * which read as "this document alone verifies you" — and it does not. A
 * marriage certificate often carries no address at all, and is issued by the
 * municipality where the wedding took place rather than where the couple
 * lives, so on its own it evidences neither residency nor current identity.
 *
 * What it genuinely proves is the one thing a birth certificate cannot: that
 * the maiden surname printed on that birth certificate and the married surname
 * in the census belong to the same person. So it is now attached *to* a primary
 * document, behind an explicit "my surname changed by marriage" declaration,
 * and both images are read together by the cross-check.
 *
 * The type row is deactivated rather than deleted — submissions already filed
 * against it keep their label, and the admin Verification Settings list keeps
 * showing it as switched off rather than silently losing a row.
 */
export class MarriageCertSupporting1753800000000 implements MigrationInterface {
  name = 'MarriageCertSupporting1753800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE verification_submissions
      ADD COLUMN surname_changed_by_marriage TINYINT NOT NULL DEFAULT 0 AFTER doc_type,
      ADD COLUMN supporting_upload_id VARCHAR(36) NULL AFTER upload_id,
      ADD CONSTRAINT fk_verification_supporting_upload
        FOREIGN KEY (supporting_upload_id) REFERENCES uploads(id) ON DELETE SET NULL
    `);
    await queryRunner.query(
      `UPDATE verification_doc_types SET is_active = 0 WHERE label_text = 'Marriage Certificate'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE verification_doc_types SET is_active = 1 WHERE label_text = 'Marriage Certificate'`,
    );
    await queryRunner.query(
      `ALTER TABLE verification_submissions DROP FOREIGN KEY fk_verification_supporting_upload`,
    );
    await queryRunner.query(`
      ALTER TABLE verification_submissions
      DROP COLUMN supporting_upload_id,
      DROP COLUMN surname_changed_by_marriage
    `);
  }
}
