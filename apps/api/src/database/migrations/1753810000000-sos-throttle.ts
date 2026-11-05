import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Escalating cooldown for the Emergency SOS button.
 *
 * The button was already deduplicated — one ACTIVE alert per resident, with
 * the staff bell ringing only when the alert is new — so mashing it during a
 * real emergency has never produced a flood. What it could not stop was a
 * troll raising a *new* alert each time staff resolved the last one.
 *
 * So the counter here measures alerts raised, not presses. That distinction is
 * the safety of the feature: pressing again while your own alert is still
 * ACTIVE is never counted and never blocked, because help is already on its
 * way and refusing that press could only ever hurt someone.
 *
 * Tiers escalate 5 -> 3 -> 1 alerts, with the first two lapses costing five
 * minutes and the third thirty. `tier` decays back to zero after an hour of
 * no new alerts, so an ordinary resident who has a bad week never inherits a
 * troll's penalties.
 */
export class SosThrottle1753810000000 implements MigrationInterface {
  name = 'SosThrottle1753810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sos_throttle (
        user_id VARCHAR(36) NOT NULL PRIMARY KEY,
        alerts_in_window INT NOT NULL DEFAULT 0,
        tier TINYINT NOT NULL DEFAULT 0,
        window_started_at DATETIME NULL,
        locked_until DATETIME NULL,
        locked_reason VARCHAR(160) NULL,
        lifted_by VARCHAR(120) NULL,
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_sos_throttle_locked (locked_until),
        CONSTRAINT fk_sos_throttle_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE sos_throttle`);
  }
}
