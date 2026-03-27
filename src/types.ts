export interface PurchaseLot {
  date: string;
  shares: number;
  buyPrice: number;
  /**
   * Set to true when this lot was created by a partial FIFO sale — i.e., the
   * original lot was only partly consumed, leaving a fractional remainder that
   * must be sold first in the next sale.
   */
  isPartialLot?: boolean;
}

export interface SaleLot {
  date: string;
  shares: number;
}

export interface HistoricalClose {
  date: string;
  close: number;
}

export interface Holding {
  id: string;
  etfId: string;
  ticker: string;
  isin?: string;
  wkn?: string;
  name: string;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  currency: string;
  sector: string;
  lots: PurchaseLot[];
  history: HistoricalClose[];
}

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  totalCost: number;
}

/** One data point in a portfolio forecast projection */
export interface ForecastPoint {
  date: string;
  totalInvested: number;
  pessimistic: number;
  realistic: number;
  optimistic: number;
}

export type Theme = 'dark' | 'light';

/** Active tab in the HoldingDetail inline panel */
export type DetailTab = 'chart' | 'lots';

export interface Settings {
  theme: Theme;
  monthlySavings: number;
  forecastYears: number;
}

/** One lot consumed (fully or partially) in a simulated FIFO sale */
export interface SimulatedSaleLot {
  date: string;
  shares: number;
  buyPrice: number;
  salePrice: number;
  cost: number;
  proceeds: number;
  gain: number;
  gainPct: number;
  /**
   * true when only part of this buy lot is being sold AND the fractional
   * remainder would be the first thing sold in the next FIFO sale.
   */
  leavesPartialRemainder?: boolean;
}

/** Full result of a simulated FIFO sale for one holding */
export interface SaleSimulationResult {
  soldLots: SimulatedSaleLot[];
  totalShares: number;
  totalCost: number;
  totalProceeds: number;
  totalGain: number;
  remainingShares: number;
  remainingValue: number;
  /** false when the requested share count exceeds available shares */
  sufficientShares: boolean;
}
