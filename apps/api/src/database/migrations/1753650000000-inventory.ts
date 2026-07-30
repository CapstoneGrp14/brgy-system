import { MigrationInterface, QueryRunner } from 'typeorm';

export class Inventory1753650000000 implements MigrationInterface {
  name = 'Inventory1753650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventory_items (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        category ENUM('MEDICINE','EQUIPMENT','SUPPLY') NOT NULL DEFAULT 'SUPPLY',
        stock_qty INT NOT NULL DEFAULT 0,
        unit VARCHAR(20) NOT NULL DEFAULT 'Pcs',
        threshold INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX uq_inventory_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE stock_movements (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        item_id VARCHAR(36) NOT NULL,
        delta INT NOT NULL,
        reason ENUM('DISPENSE','RESTOCK','ADJUST') NOT NULL,
        actor_label VARCHAR(120) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_stock_movements_item (item_id),
        CONSTRAINT fk_stock_movements_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Seed mirroring the design (Paracetamol + Wheelchair start auto-closed).
    const items: Array<[string, string, number, string, number]> = [
      ['Paracetamol 500mg', 'MEDICINE', 8, 'Tablets', 20],
      ['Multivitamins', 'MEDICINE', 22, 'Packs', 20],
      ['Losartan 50mg', 'MEDICINE', 30, 'Strips', 10],
      ['Nebulizer', 'EQUIPMENT', 2, 'Units', 1],
      ['Wheelchair', 'EQUIPMENT', 1, 'Units', 1],
      ['BP Monitor', 'EQUIPMENT', 5, 'Units', 2],
      ['Oxygen Tank', 'EQUIPMENT', 3, 'Units', 2],
      ['Plastic Chairs', 'SUPPLY', 150, 'Pcs', 20],
    ];
    for (const [name, category, qty, unit, threshold] of items) {
      await queryRunner.query(
        `INSERT INTO inventory_items (id, name, category, stock_qty, unit, threshold)
         VALUES (UUID(), ?, ?, ?, ?, ?)`,
        [name, category, qty, unit, threshold],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE stock_movements`);
    await queryRunner.query(`DROP TABLE inventory_items`);
  }
}
