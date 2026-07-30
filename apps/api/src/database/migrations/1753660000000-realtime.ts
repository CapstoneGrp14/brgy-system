import { MigrationInterface, QueryRunner } from 'typeorm';

export class Realtime1753660000000 implements MigrationInterface {
  name = 'Realtime1753660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sos_alerts (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        lat DECIMAL(10,7) NULL,
        lng DECIMAL(10,7) NULL,
        accuracy FLOAT NULL,
        status ENUM('ACTIVE','RESOLVED') NOT NULL DEFAULT 'ACTIVE',
        resolved_by VARCHAR(120) NULL,
        resolved_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_sos_user (user_id),
        INDEX idx_sos_status (status),
        CONSTRAINT fk_sos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE chat_messages (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        sender_id VARCHAR(36) NOT NULL,
        sender_name VARCHAR(120) NOT NULL,
        sender_role VARCHAR(20) NOT NULL,
        body VARCHAR(500) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_chat_sender (sender_id),
        INDEX idx_chat_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE assistant_queries (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NULL,
        question VARCHAR(300) NOT NULL,
        intent VARCHAR(30) NOT NULL,
        resolved TINYINT(1) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_assistant_intent (intent)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE assistant_queries`);
    await queryRunner.query(`DROP TABLE chat_messages`);
    await queryRunner.query(`DROP TABLE sos_alerts`);
  }
}
