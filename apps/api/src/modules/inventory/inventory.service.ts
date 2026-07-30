import { InventoryCategory, InventoryItemDto } from '@brgy/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Facility } from '../bookings/facility.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryItem } from './inventory-item.entity';
import { StockMovement } from './stock-movement.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem) private readonly items: Repository<InventoryItem>,
    @InjectRepository(StockMovement) private readonly movements: Repository<StockMovement>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Category decides where the item surfaces for residents:
   * MEDICINE / EQUIPMENT → Health & Medicine; SUPPLY → bookable in My Bookings
   * (a matching booking facility is auto-created).
   */
  async addItem(
    input: { name: string; category: InventoryCategory; stockQty: number; unit: string; threshold: number },
    actor: { fullName: string; id: string },
  ): Promise<InventoryItemDto> {
    const name = input.name.trim();
    const exists = await this.items.findOne({ where: { name } });
    if (exists) throw new BadRequestException('An item with this name already exists.');

    const item = await this.items.save(
      this.items.create({
        name,
        category: input.category,
        stockQty: input.stockQty,
        unit: input.unit.trim() || 'Pcs',
        threshold: input.threshold,
      }),
    );
    if (input.stockQty > 0) {
      await this.movements.insert({
        itemId: item.id,
        delta: input.stockQty,
        reason: 'ADJUST',
        actorLabel: `${actor.fullName} (Admin) — initial stock`,
      });
    }

    if (input.category === 'SUPPLY') {
      const facility = await this.facilities.findOne({ where: { name } });
      if (!facility) {
        await this.facilities.save(
          this.facilities.create({ name, type: 'EQUIPMENT', blockedSlots: [], isActive: true }),
        );
      } else if (!facility.isActive) {
        await this.facilities.update({ id: facility.id }, { isActive: true });
      }
    }

    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: 'Added Inventory Item',
      target: `${name} (${input.category}) — ${input.stockQty} ${item.unit}, threshold ${input.threshold}`,
    });
    return this.toDto(item);
  }

  /** Edit item details; keeps the linked booking facility in sync on rename/re-category. */
  async updateItem(
    id: string,
    input: { name: string; category: InventoryCategory; stockQty: number; unit: string; threshold: number },
    actor: { fullName: string; id: string },
  ): Promise<InventoryItemDto> {
    const item = await this.getItem(id);
    const name = input.name.trim();
    if (name !== item.name) {
      const clash = await this.items.findOne({ where: { name } });
      if (clash && clash.id !== id) throw new BadRequestException('An item with this name already exists.');
    }

    const oldName = item.name;
    const oldCategory = item.category;
    const wasClosed = item.stockQty <= item.threshold;
    const stockDelta = input.stockQty - item.stockQty;

    item.name = name;
    item.category = input.category;
    item.stockQty = input.stockQty;
    item.unit = input.unit.trim() || 'Pcs';
    item.threshold = input.threshold;
    await this.items.save(item);

    if (stockDelta !== 0) {
      await this.movements.insert({
        itemId: item.id,
        delta: stockDelta,
        reason: 'ADJUST',
        actorLabel: `${actor.fullName} (Admin) — stock corrected`,
      });
    }

    // Facility sync: supplies are bookable; medicine/medical equipment never are.
    if (oldCategory === 'SUPPLY' && input.category !== 'SUPPLY') {
      const facility = await this.facilities.findOne({ where: { name: oldName } });
      if (facility) await this.facilities.update({ id: facility.id }, { isActive: false });
    } else if (input.category === 'SUPPLY') {
      const facility = await this.facilities.findOne({ where: { name: oldName } });
      if (facility) {
        await this.facilities.update({ id: facility.id }, { name, isActive: true });
      } else {
        const existing = await this.facilities.findOne({ where: { name } });
        if (existing) await this.facilities.update({ id: existing.id }, { isActive: true });
        else
          await this.facilities.save(
            this.facilities.create({ name, type: 'EQUIPMENT', blockedSlots: [], isActive: true }),
          );
      }
    }

    const nowOpen = item.stockQty > item.threshold;
    if (wasClosed && nowOpen) {
      await this.notifications.notifyStaff(
        `📦 ${item.name} updated to ${item.stockQty} ${item.unit} — resident requests re-opened`,
        'inventory',
      );
    }

    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: 'Edited Inventory Item',
      target: `${oldName === name ? name : `${oldName} → ${name}`} (${input.category}) — ${item.stockQty} ${item.unit}, threshold ${item.threshold}`,
    });
    return this.toDto(item);
  }

  async removeItem(id: string, actor: { fullName: string; id: string }): Promise<void> {
    const item = await this.getItem(id);
    // Block deletion while open requests still reference the item.
    const [{ n }] = await this.dataSource.query(
      `SELECT COUNT(*) AS n FROM service_requests
       WHERE type IN ('MEDICINE','EQUIPMENT')
         AND status NOT IN ('CLAIMED','CLOSED','REJECTED','COMPLETED')
         AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.itemId')) = ?`,
      [id],
    );
    if (Number(n) > 0) {
      throw new BadRequestException(
        `${item.name} still has ${n} open request(s) — resolve them before deleting.`,
      );
    }

    await this.items.delete({ id });
    if (item.category === 'SUPPLY') {
      // Retire the linked booking facility (disable, not delete — bookings reference it).
      const facility = await this.facilities.findOne({ where: { name: item.name } });
      if (facility) await this.facilities.update({ id: facility.id }, { isActive: false });
    }
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: 'Deleted Inventory Item',
      target: item.name,
    });
  }

  private toDto(i: InventoryItem): InventoryItemDto {
    return {
      id: i.id,
      name: i.name,
      category: i.category,
      stockQty: i.stockQty,
      unit: i.unit,
      threshold: i.threshold,
      isOpen: i.stockQty > i.threshold,
    };
  }

  async list(category?: InventoryCategory, openOnly = false): Promise<InventoryItemDto[]> {
    const rows = await this.items.find({ order: { category: 'ASC', name: 'ASC' } });
    return rows
      .map((i) => this.toDto(i))
      .filter((i) => (!category || i.category === category) && (!openOnly || i.isOpen));
  }

  async getItem(id: string): Promise<InventoryItem> {
    const item = await this.items.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Inventory item not found.');
    return item;
  }

  /** Consume stock (e.g. a claimed medicine request). Alerts staff on threshold crossing. */
  async dispense(itemId: string, qty: number, actorLabel: string): Promise<void> {
    const item = await this.getItem(itemId);
    const before = item.stockQty;
    item.stockQty = Math.max(0, item.stockQty - qty);
    await this.items.save(item);
    await this.movements.insert({ itemId, delta: -qty, reason: 'DISPENSE', actorLabel });

    if (before > item.threshold && item.stockQty <= item.threshold) {
      await this.notifications.notifyStaff(
        `📦 ${item.name} fell to ${item.stockQty} ${item.unit} (threshold ${item.threshold}) — resident requests auto-closed`,
        'inventory',
      );
      this.audit.log({
        actorLabel: 'Inventory Monitor',
        action: 'Auto-Closed Resident Requests (low stock)',
        target: `${item.name} — ${item.stockQty} ${item.unit} left`,
      });
    }
  }

  /** Returned equipment goes back into stock; re-opens lending if it crosses the threshold. */
  async returnStock(itemId: string, qty: number, actorLabel: string): Promise<void> {
    const item = await this.getItem(itemId);
    const wasClosed = item.stockQty <= item.threshold;
    item.stockQty += qty;
    await this.items.save(item);
    await this.movements.insert({ itemId, delta: qty, reason: 'ADJUST', actorLabel });
    if (wasClosed && item.stockQty > item.threshold) {
      await this.notifications.notifyStaff(
        `📦 ${item.name} returned — back to ${item.stockQty} ${item.unit}, lending re-opened`,
        'inventory',
      );
    }
  }

  async restock(itemId: string, qty: number, actor: { fullName: string; id: string }): Promise<InventoryItemDto> {
    if (qty <= 0) throw new BadRequestException('Restock quantity must be positive.');
    const item = await this.getItem(itemId);
    const wasClosed = item.stockQty <= item.threshold;
    item.stockQty += qty;
    await this.items.save(item);
    await this.movements.insert({
      itemId,
      delta: qty,
      reason: 'RESTOCK',
      actorLabel: `${actor.fullName} (Admin)`,
    });
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: 'Restocked Inventory Item',
      target: `${item.name} +${qty} ${item.unit} (now ${item.stockQty})`,
    });
    if (wasClosed && item.stockQty > item.threshold) {
      await this.notifications.notifyStaff(
        `📦 ${item.name} restocked to ${item.stockQty} ${item.unit} — resident requests re-opened`,
        'inventory',
      );
    }
    return this.toDto(item);
  }

  async lowStockCount(): Promise<number> {
    const rows = await this.items.find();
    return rows.filter((i) => i.stockQty <= i.threshold).length;
  }
}
