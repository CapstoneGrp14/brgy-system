import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentTypeSettings1753540000000 implements MigrationInterface {
  name = 'DocumentTypeSettings1753540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE document_type_settings (
        document_type VARCHAR(60) NOT NULL PRIMARY KEY,
        release_mode ENUM('DIGITAL','PICKUP') NOT NULL DEFAULT 'DIGITAL',
        updated_by VARCHAR(120) NOT NULL,
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // Barangay Clearance carries a dry seal + wet signature → pickup by default.
    await queryRunner.query(`
      INSERT INTO document_type_settings (document_type, release_mode, updated_by)
      VALUES ('BARANGAY_CLEARANCE', 'PICKUP', 'System Default')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE document_type_settings`);
  }
}
