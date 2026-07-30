import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  name: string;

  @Column({ type: 'enum', enum: ['MEDICINE', 'EQUIPMENT', 'SUPPLY'], default: 'SUPPLY' })
  category: 'MEDICINE' | 'EQUIPMENT' | 'SUPPLY';

  @Column({ name: 'stock_qty', type: 'int', default: 0 })
  stockQty: number;

  @Column({ type: 'varchar', length: 20, default: 'Pcs' })
  unit: string;

  /** Resident requests auto-close when stockQty falls to/below this (FR-6.3). */
  @Column({ type: 'int', default: 0 })
  threshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
