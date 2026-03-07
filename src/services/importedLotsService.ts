import { PurchaseLot, SaleLot } from '../types';

const LOTS_STORAGE_KEY = 'portfoliowatch_imported_lots';
const SALES_STORAGE_KEY = 'portfoliowatch_imported_sales';

/** Load all CSV-imported buy lots from localStorage, keyed by ISIN */
export function getImportedLots(): Record<string, PurchaseLot[]> {
  try {
    const raw = localStorage.getItem(LOTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PurchaseLot[]>) : {};
  } catch {
    return {};
  }
}

/** Persist imported buy lots to localStorage */
export function saveImportedLots(lots: Record<string, PurchaseLot[]>): void {
  try {
    localStorage.setItem(LOTS_STORAGE_KEY, JSON.stringify(lots));
  } catch {
    // localStorage not available (private browsing, quota exceeded, etc.)
  }
}

/** Load all CSV-imported sell lots from localStorage, keyed by ISIN */
export function getImportedSales(): Record<string, SaleLot[]> {
  try {
    const raw = localStorage.getItem(SALES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SaleLot[]>) : {};
  } catch {
    return {};
  }
}

/** Persist imported sell lots to localStorage */
export function saveImportedSales(sales: Record<string, SaleLot[]>): void {
  try {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
  } catch {
    // localStorage not available (private browsing, quota exceeded, etc.)
  }
}
