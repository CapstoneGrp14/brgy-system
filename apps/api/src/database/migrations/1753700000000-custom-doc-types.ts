import { MigrationInterface, QueryRunner } from 'typeorm';

/** document_type_settings grows from a release-mode map into the registry of
 *  custom document types staff can offer to residents. */
export class CustomDocTypes1753700000000 implements MigrationInterface {
  name = 'CustomDocTypes1753700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE document_type_settings
        ADD COLUMN label_text VARCHAR(120) NULL AFTER document_type,
        ADD COLUMN sla_class VARCHAR(20) NULL AFTER label_text,
        ADD COLUMN is_custom TINYINT(1) NOT NULL DEFAULT 0 AFTER sla_class,
        ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_custom
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE document_type_settings
        DROP COLUMN label_text, DROP COLUMN sla_class, DROP COLUMN is_custom, DROP COLUMN is_active
    `);
  }
}
