import { Holding, PurchaseLot, SaleSimulationResult, SimulatedSaleLot } from '../types';

export function calculateTotalValue(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
}

export function calculateTotalCost(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + h.shares * h.avgBuyPrice, 0);
}

export function calculateTotalGain(holdings: Holding[]): number {
  return calculateTotalValue(holdings) - calculateTotalCost(holdings);
}

export function calculateTotalGainPercent(holdings: Holding[]): number {
  const cost = calculateTotalCost(holdings);
  if (cost === 0) return 0;
  return ((calculateTotalValue(holdings) - cost) / cost) * 100;
}

export function calculateHoldingGain(holding: Holding): number {
  return (holding.currentPrice - holding.avgBuyPrice) * holding.shares;
}

export function calculateHoldingGainPercent(holding: Holding): number {
  if (holding.avgBuyPrice === 0) return 0;
  return ((holding.currentPrice - holding.avgBuyPrice) / holding.avgBuyPrice) * 100;
}

export function calculatePriceGainPercent(currentPrice: number, buyPrice: number): number {
  if (buyPrice === 0) return 0;
  return ((currentPrice - buyPrice) / buyPrice) * 100;
}

export function formatCurrency(value: number, currency = 'EUR', locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/** Format a share count using German locale (comma as decimal separator) */
export function formatShares(shares: number): string {
  return shares.toLocaleString('de-DE', { maximumFractionDigits: 6 });
}

/**
 * Parse a German-formatted number string where periods are thousands separators
 * and a comma is the decimal separator (e.g. "1.234,56" → 1234.56).
 * Also accepts plain integers or comma-decimal numbers without thousands separators
 * ("10" → 10, "10,5" → 10.5). Note: English-style decimal periods ("10.5") will be
 * misinterpreted as thousands separators ("10.5" → 105) — always use comma for decimals.
 * Returns NaN for empty or non-numeric input; callers must check with isNaN().
 */
export function parseGermanNumber(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

/** Returns today's date as a 'YYYY-MM-DD' string (UTC). */
export function todayIsoString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Returns true when `shares` is not a whole number (e.g. 10.35 → true). */
export function isFractional(shares: number): boolean {
  return Math.abs(shares - Math.round(shares)) > 1e-9;
}

/**
 * Simulate a FIFO sale of `sharesToSell` shares at `salePrice`.
 * Processes the oldest buy lots first (caller must pass lots sorted oldest-first).
 */
export function simulateFifoSale(
  lots: PurchaseLot[],
  salePrice: number,
  sharesToSell: number,
): SaleSimulationResult {
  const totalAvailable = lots.reduce((s, l) => s + l.shares, 0);
  const sufficientShares = sharesToSell <= totalAvailable + 1e-9;
  const actualSell = Math.min(sharesToSell, totalAvailable);

  const soldLots: SimulatedSaleLot[] = [];
  let remaining = actualSell;

  for (const lot of lots) {
    if (remaining <= 1e-9) break;
    const sellFromLot = Math.min(lot.shares, remaining);
    const cost = sellFromLot * lot.buyPrice;
    const proceeds = sellFromLot * salePrice;
    const gain = proceeds - cost;
    // A simulated sell leaves a partial remainder when only part of the lot is
    // consumed AND that leftover is non-integer (a "Bruchstück" to sell first next time).
    const leftover = lot.shares - sellFromLot;
    const leavesPartialRemainder = leftover > 1e-9 && isFractional(leftover);
    soldLots.push({
      date: lot.date,
      shares: sellFromLot,
      buyPrice: lot.buyPrice,
      salePrice,
      cost,
      proceeds,
      gain,
      gainPct: lot.buyPrice > 0 ? ((salePrice - lot.buyPrice) / lot.buyPrice) * 100 : 0,
      leavesPartialRemainder,
    });
    remaining = Math.max(0, remaining - lot.shares);
  }

  const totalShares = soldLots.reduce((s, l) => s + l.shares, 0);
  const totalCost = soldLots.reduce((s, l) => s + l.cost, 0);
  const totalProceeds = soldLots.reduce((s, l) => s + l.proceeds, 0);
  const totalGain = totalProceeds - totalCost;
  const remainingShares = Math.max(0, totalAvailable - totalShares);
  const remainingValue = remainingShares * salePrice;

  return {
    soldLots,
    totalShares,
    totalCost,
    totalProceeds,
    totalGain,
    remainingShares,
    remainingValue,
    sufficientShares,
  };
}

/**
 * Calculate the number of shares (using FIFO order) required to realise exactly
 * `targetGain` euros of profit at `salePrice`.
 *
 * Loss-making lots must be sold through first (FIFO) before later profitable
 * lots can contribute.  Returns the total available shares when the target
 * cannot be fully achieved.
 */
export function sharesForTargetGain(
  lots: PurchaseLot[],
  salePrice: number,
  targetGain: number,
): number {
  if (targetGain <= 0) return 0;

  let accumulated = 0;
  let totalShares = 0;

  for (const lot of lots) {
    if (accumulated >= targetGain) break;

    const gainPerShare = salePrice - lot.buyPrice;
    const fullLotGain = gainPerShare * lot.shares;

    if (gainPerShare > 0 && accumulated + fullLotGain >= targetGain) {
      // This lot can get us to the target — sell only the partial amount needed
      const partialShares = (targetGain - accumulated) / gainPerShare;
      totalShares += partialShares;
      return totalShares;
    }

    // Sell all of this lot (either a loss lot or insufficient gain to hit target)
    accumulated += fullLotGain;
    totalShares += lot.shares;
  }

  // Target not fully achievable — return all available shares
  return totalShares;
}
