import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-field OCR scoring.
 *
 * The score was `name * 0.8 + address * 0.2`, so a document carrying only the
 * resident's name always read as exactly 80%. Each document type now declares
 * which fields it should contain and what each is worth, and every submission
 * stores the resulting per-field checklist so staff can see what actually
 * matched rather than trusting one blended number.
 *
 * Both columns are nullable: existing submissions keep their old score with no
 * breakdown, and document types without a spec fall back to DEFAULT_OCR_FIELDS.
 */
export class OcrFieldScoring1753740000000 implements MigrationInterface {
  name = 'OcrFieldScoring1753740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE verification_doc_types
      ADD COLUMN ocr_fields JSON NULL AFTER label_text
    `);
    await queryRunner.query(`
      ALTER TABLE verification_submissions
      ADD COLUMN ocr_fields JSON NULL AFTER match_score
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE verification_submissions DROP COLUMN ocr_fields`);
    await queryRunner.query(`ALTER TABLE verification_doc_types DROP COLUMN ocr_fields`);
  }
}
