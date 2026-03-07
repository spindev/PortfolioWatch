import { PurchaseLot } from '../types';

const STORAGE_KEY = 'portfoliowatch_imported_lots';

/** Load all CSV-imported lots from localStorage, keyed by ISIN */
export function getImportedLots(): Record<string, PurchaseLot[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PurchaseLot[]>) : {};
  } catch {
    return {};
  }
}

/** Persist imported lots to localStorage */
export function saveImportedLots(lots: Record<string, PurchaseLot[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lots));
  } catch {
    // localStorage not available (private browsing, quota exceeded, etc.)
  }
}
