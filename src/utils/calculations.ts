import { Holding } from '../types';

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

export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
