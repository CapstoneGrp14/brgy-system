import { MigrationInterface, QueryRunner } from 'typeorm';

/** Baseline migration — proves the migration pipeline; real entities arrive in Phase 1. */
export class Init1753500000000 implements MigrationInterface {
  name = 'Init1753500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE app_meta (
        \`key\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`value\` VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(
      `INSERT INTO app_meta (\`key\`, \`value\`) VALUES ('bootstrap', 'phase-0')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE app_meta`);
  }
}
