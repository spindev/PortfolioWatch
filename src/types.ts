export interface ETF {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  currency: string;
  sector: string;
}

export interface PurchaseLot {
  date: string;
  shares: number;
  buyPrice: number;
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

export type Theme = 'dark' | 'light';

export interface Settings {
  theme: Theme;
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
