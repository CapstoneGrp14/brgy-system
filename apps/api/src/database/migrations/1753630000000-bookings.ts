import { MigrationInterface, QueryRunner } from 'typeorm';

export class Bookings1753630000000 implements MigrationInterface {
  name = 'Bookings1753630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE facilities (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        type ENUM('FACILITY','EQUIPMENT') NOT NULL DEFAULT 'FACILITY',
        blocked_slots JSON NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX uq_facilities_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE bookings (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        facility_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        purpose VARCHAR(160) NULL,
        date DATE NOT NULL,
        time_slot VARCHAR(12) NOT NULL,
        status ENUM('PENDING','CONFIRMED','REJECTED') NOT NULL DEFAULT 'PENDING',
        decided_by VARCHAR(120) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_bookings_facility (facility_id),
        INDEX idx_bookings_user (user_id),
        INDEX idx_bookings_date (date),
        INDEX idx_bookings_status (status),
        CONSTRAINT fk_bookings_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
        CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Facilities from the design; Covered Court has the recurring Zumba block @ 10 AM.
    // Health equipment (nebulizer etc.) is NOT bookable here — it lives in
    // Health & Medicine lending, which tracks stock and returns.
    const facilities: Array<[string, string, string | null]> = [
      ['Health Assistance (BP Check, Consult)', 'FACILITY', null],
      ['Covered Court (Basketball)', 'FACILITY', JSON.stringify([{ slot: '10:00 AM', title: 'Zumba Class' }])],
      ['Barangay Hall (Community Event)', 'FACILITY', null],
      ['Plastic Chairs & Tables', 'EQUIPMENT', null],
    ];
    for (const [name, type, blocked] of facilities) {
      await queryRunner.query(
        `INSERT INTO facilities (id, name, type, blocked_slots) VALUES (UUID(), ?, ?, ?)`,
        [name, type, blocked],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE bookings`);
    await queryRunner.query(`DROP TABLE facilities`);
  }
}
