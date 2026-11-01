/**
 * Power Cells Data for Neuro-Scrap
 * Shared by all subsequent chapters and task minigames.
 */

export interface PowerCellData {
  id: number;
  charge: number; // 0.0 to 1.0
  damage: number; // 0.0 to 1.0
  good: boolean;
}

export const POWER_CELLS: PowerCellData[] = [
  { id: 1, charge: 0.9, damage: 0.1, good: true },
  { id: 2, charge: 0.8, damage: 0.2, good: true },
  { id: 3, charge: 0.7, damage: 0.1, good: true },
  { id: 4, charge: 0.9, damage: 0.8, good: false }, // Bright but cracked
  { id: 5, charge: 0.2, damage: 0.1, good: false }, // Clean but depleted
  { id: 6, charge: 0.1, damage: 0.7, good: false },
  { id: 7, charge: 0.6, damage: 0.2, good: true },
  { id: 8, charge: 0.8, damage: 0.7, good: false }, // Bright but damaged
  { id: 9, charge: 0.3, damage: 0.3, good: false },
  { id: 10, charge: 0.7, damage: 0.3, good: true },
];

/**
 * Rack display order for the Salvage Station minigame
 */
export const RACK_CELL_ORDER = [4, 1, 9, 6, 2, 10, 8, 3, 5, 7];
