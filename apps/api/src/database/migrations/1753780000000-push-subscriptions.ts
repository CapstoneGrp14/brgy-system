import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Browser push subscriptions, for urgent announcements.
 *
 * Evacuation notices are the case that matters: a resident who is not looking
 * at the portal still needs to hear about flooding or a fire. The in-app bell
 * and email already exist, but neither reaches a phone sitting in a pocket.
 *
 * One row per browser, not per person — a resident may subscribe from their
 * phone and a desktop, and each has its own endpoint. The endpoint is unique,
 * so re-subscribing the same browser updates rather than duplicates.
 */
export class PushSubscriptions1753780000000 implements MigrationInterface {
  name = 'PushSubscriptions1753780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE push_subscriptions (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        user_agent VARCHAR(255) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        last_used_at DATETIME NULL,
        UNIQUE KEY uq_push_endpoint (endpoint(255)),
        INDEX idx_push_user (user_id),
        CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE push_subscriptions`);
  }
}
