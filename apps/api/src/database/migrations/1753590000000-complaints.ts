import { MigrationInterface, QueryRunner } from 'typeorm';

export class Complaints1753590000000 implements MigrationInterface {
  name = 'Complaints1753590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE complaints (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        case_title VARCHAR(160) NOT NULL,
        category VARCHAR(40) NOT NULL,
        description TEXT NOT NULL,
        respondent_name VARCHAR(120) NOT NULL,
        complainant_id VARCHAR(36) NULL,
        contact_number VARCHAR(20) NULL,
        is_anonymous TINYINT NOT NULL DEFAULT 0,
        evidence_upload_id VARCHAR(36) NULL,
        source ENUM('RESIDENT_FORM','MANUAL_BLOTTER') NOT NULL DEFAULT 'RESIDENT_FORM',
        status ENUM('FILED','SUMMONS','MEDIATION','CFA_ISSUED','RESOLVED') NOT NULL DEFAULT 'FILED',
        lupon_assignee VARCHAR(120) NULL,
        mediation_due_at DATETIME NULL,
        overdue_flagged TINYINT NOT NULL DEFAULT 0,
        resolved_at DATETIME NULL,
        filed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_complaints_complainant (complainant_id),
        INDEX idx_complaints_status (status),
        CONSTRAINT fk_complaints_user FOREIGN KEY (complainant_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_complaints_evidence FOREIGN KEY (evidence_upload_id) REFERENCES uploads(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE complaints`);
  }
}
