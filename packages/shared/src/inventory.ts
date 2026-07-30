export type InventoryCategory = 'MEDICINE' | 'EQUIPMENT' | 'SUPPLY';

export interface InventoryItemDto {
  id: string;
  name: string;
  category: InventoryCategory;
  stockQty: number;
  unit: string;
  threshold: number;
  /** stockQty > threshold — resident requests auto-close when false (FR-6.3). */
  isOpen: boolean;
}

export const MEDICINE_QUANTITIES = ['1 piece / strip', '1 box', '1 bottle'] as const;

export const PRINTING_SERVICES = [
  'Printing (Black & White)',
  'Printing (Colored)',
  'Laminating',
] as const;
