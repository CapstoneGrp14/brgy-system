import { MigrationInterface, QueryRunner } from 'typeorm';

export class BookingConfig1753640000000 implements MigrationInterface {
  name = 'BookingConfig1753640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE facilities ADD COLUMN is_active TINYINT NOT NULL DEFAULT 1`);
    await queryRunner.query(`
      CREATE TABLE booking_slots (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        label VARCHAR(12) NOT NULL,
        sort INT NOT NULL DEFAULT 0,
        is_off_peak TINYINT NOT NULL DEFAULT 0,
        is_active TINYINT NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX uq_booking_slots_label (label)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const slots: Array<[string, number, number]> = [
      ['7:00 AM', 1, 0],
      ['8:00 AM', 2, 0],
      ['9:00 AM', 3, 0],
      ['10:00 AM', 4, 0],
      ['1:00 PM', 5, 1],
      ['3:00 PM', 6, 1],
      ['5:00 PM', 7, 1],
    ];
    for (const [label, sort, offPeak] of slots) {
      await queryRunner.query(
        `INSERT INTO booking_slots (id, label, sort, is_off_peak) VALUES (UUID(), ?, ?, ?)`,
        [label, sort, offPeak],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE booking_slots`);
    await queryRunner.query(`ALTER TABLE facilities DROP COLUMN is_active`);
  }
}
