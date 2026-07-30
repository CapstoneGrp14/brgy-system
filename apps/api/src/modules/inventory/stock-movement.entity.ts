import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Every stock change goes through a movement (dispense/restock/adjust). */
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Index()
  @Column({ name: 'item_id', type: 'varchar', length: 36 })
  itemId: string;

  @Column({ type: 'int' })
  delta: number;

  @Column({ type: 'enum', enum: ['DISPENSE', 'RESTOCK', 'ADJUST'] })
  reason: 'DISPENSE' | 'RESTOCK' | 'ADJUST';

  @Column({ name: 'actor_label', type: 'varchar', length: 120 })
  actorLabel: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
