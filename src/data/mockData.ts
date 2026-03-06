import { Holding, PortfolioSnapshot } from '../types';

export const mockHoldings: Holding[] = [
  {
    id: '1',
    etfId: 'msci-world',
    ticker: 'IWDA',
    name: 'iShares Core MSCI World ETF',
    shares: 45,
    avgBuyPrice: 78.5,
    currentPrice: 92.3,
    currency: 'EUR',
    sector: 'Global Equity',
  },
  {
    id: '2',
    etfId: 'sp500',
    ticker: 'CSPX',
    name: 'iShares Core S&P 500 ETF',
    shares: 30,
    avgBuyPrice: 420.0,
    currentPrice: 510.5,
    currency: 'USD',
    sector: 'US Equity',
  },
  {
    id: '3',
    etfId: 'emerging',
    ticker: 'EIMI',
    name: 'iShares Core MSCI EM IMI ETF',
    shares: 100,
    avgBuyPrice: 28.4,
    currentPrice: 31.2,
    currency: 'USD',
    sector: 'Emerging Markets',
  },
  {
    id: '4',
    etfId: 'bonds',
    ticker: 'AGGH',
    name: 'iShares Core Global Aggregate Bond ETF',
    shares: 80,
    avgBuyPrice: 5.1,
    currentPrice: 5.3,
    currency: 'EUR',
    sector: 'Bonds',
  },
  {
    id: '5',
    etfId: 'europe',
    ticker: 'STOXX',
    name: 'iShares STOXX Europe 600 ETF',
    shares: 60,
    avgBuyPrice: 44.2,
    currentPrice: 49.8,
    currency: 'EUR',
    sector: 'European Equity',
  },
];

export const generatePortfolioHistory = (): PortfolioSnapshot[] => {
  const snapshots: PortfolioSnapshot[] = [];
  const today = new Date();
  const totalCost = 15420.5;
  let totalValue = 15420.5;

  for (let i = 365; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const randomChange = (Math.random() - 0.45) * 0.8;
    totalValue = totalValue * (1 + randomChange / 100);
    snapshots.push({
      date: date.toISOString().split('T')[0],
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: totalCost,
    });
  }
  return snapshots;
};
