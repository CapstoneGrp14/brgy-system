import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequestsNotifications1753520000000 implements MigrationInterface {
  name = 'RequestsNotifications1753520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE service_requests (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type ENUM('DOCUMENT','CCTV','MEDICINE','EQUIPMENT','PRINTING') NOT NULL,
        subtype VARCHAR(60) NOT NULL,
        title VARCHAR(120) NOT NULL,
        purpose VARCHAR(255) NULL,
        sla_class ENUM('SIMPLE_3','COMPLEX_7','TECHNICAL_20') NOT NULL,
        status ENUM('PENDING','PROCESSING','READY','COMPLETED','CLAIMED','OVERDUE','ESCALATED','REJECTED','CLOSED') NOT NULL DEFAULT 'PENDING',
        due_at DATETIME NOT NULL,
        completed_at DATETIME NULL,
        payload JSON NULL,
        document_key VARCHAR(255) NULL,
        filed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_service_requests_user (user_id),
        INDEX idx_service_requests_status (status),
        INDEX idx_service_requests_due (due_at),
        CONSTRAINT fk_service_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE request_events (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        request_id VARCHAR(36) NOT NULL,
        actor_label VARCHAR(120) NOT NULL,
        from_status ENUM('PENDING','PROCESSING','READY','COMPLETED','CLAIMED','OVERDUE','ESCALATED','REJECTED','CLOSED') NULL,
        to_status ENUM('PENDING','PROCESSING','READY','COMPLETED','CLAIMED','OVERDUE','ESCALATED','REJECTED','CLOSED') NOT NULL,
        note VARCHAR(255) NULL,
        at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_request_events_request (request_id),
        CONSTRAINT fk_request_events_request FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(30) NOT NULL DEFAULT 'system',
        read_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_notifications_user (user_id),
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE notifications`);
    await queryRunner.query(`DROP TABLE request_events`);
    await queryRunner.query(`DROP TABLE service_requests`);
  }
}
