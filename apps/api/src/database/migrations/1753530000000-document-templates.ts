import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentTemplates1753530000000 implements MigrationInterface {
  name = 'DocumentTemplates1753530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE document_templates (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        document_type VARCHAR(60) NOT NULL,
        name VARCHAR(120) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        storage_key VARCHAR(255) NOT NULL,
        is_active TINYINT NOT NULL DEFAULT 0,
        uploaded_by VARCHAR(120) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_document_templates_type (document_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE document_templates`);
  }
}
