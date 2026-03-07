export interface ETF {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  currency: string;
  sector: string;
}

export interface Holding {
  id: string;
  etfId: string;
  ticker: string;
  name: string;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  currency: string;
  sector: string;
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
