import { Holding, PortfolioSnapshot } from '../types';

// Demo portfolio: 3 ETFs, 100 shares each
export interface DemoEtfDef {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  shares: number;
}

export const DEMO_ETFS: DemoEtfDef[] = [
  {
    id: 'world',
    ticker: 'URTH',
    name: 'iShares MSCI World ETF',
    sector: 'Global Equity',
    shares: 100,
  },
  {
    id: 'em',
    ticker: 'EEM',
    name: 'iShares MSCI Emerging Markets ETF',
    sector: 'Emerging Markets',
    shares: 100,
  },
  {
    id: 'esg',
    ticker: 'LCEU.SW',
    name: 'iShares MSCI Europe ESG Enhanced ETF',
    sector: 'ESG Europe',
    shares: 100,
  },
];

const YF_DIRECT_BASE = 'https://query2.finance.yahoo.com';

// In development the vite proxy forwards /api/yf → https://query2.finance.yahoo.com
const YF_DEV_PROXY = '/api/yf';

// Production CORS proxies tried in order.  The target URL is always
// percent-encoded so that query-string delimiters (? &) in the Yahoo Finance
// URL are not misinterpreted as proxy query parameters.
const CORS_PROXIES: Array<(url: string) => string> = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Fetch a Yahoo Finance path, routing through the Vite dev-proxy in
 * development or through a series of public CORS proxies in production.
 * Falls back to the next proxy when a network error or non-OK status occurs.
 */
async function fetchYF(path: string, options?: RequestInit): Promise<Response> {
  if (import.meta.env.DEV) {
    return fetchWithTimeout(`${YF_DEV_PROXY}${path}`, options);
  }

  const directUrl = `${YF_DIRECT_BASE}${path}`;
  let lastError: Error = new Error('No CORS proxy available');
  for (const buildProxy of CORS_PROXIES) {
    const proxyUrl = buildProxy(directUrl);
    try {
      const res = await fetchWithTimeout(proxyUrl, options);
      if (res.ok) return res;
      lastError = new Error(`Proxy returned ${res.status}: ${proxyUrl}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError;
}

export interface QuoteResult {
  ticker: string;
  price: number;
  currency: string;
}

export interface HistoricalPoint {
  date: string;
  close: number;
}

interface YFChartQuote {
  close: (number | null)[];
}

interface YFChartResult {
  meta?: { currency?: string };
  timestamp?: number[];
  indicators?: { quote?: YFChartQuote[] };
}

interface YFChartResponse {
  chart?: { result?: YFChartResult[] };
}

export async function fetchQuotes(tickers: string[]): Promise<QuoteResult[]> {
  // Use the chart endpoint to retrieve the latest close price for each ticker.
  // The v7/finance/quote endpoint returns 403 without authenticated sessions,
  // while v8/finance/chart continues to work without authentication.
  const results = await Promise.all(
    tickers.map(async (ticker): Promise<QuoteResult> => {
      const path = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
      const res = await fetchYF(path, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Quote API error: ${res.status}`);
      const data: YFChartResponse = await res.json();
      const result = data.chart?.result?.[0];
      if (!result) throw new Error('No chart data in response');
      const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
      const validCloses = closes.filter((c): c is number => c != null && c > 0);
      const price = validCloses[validCloses.length - 1] ?? 0;
      return {
        ticker,
        price,
        currency: result.meta?.currency ?? 'USD',
      };
    })
  );
  return results;
}

export async function fetchHistorical(ticker: string): Promise<HistoricalPoint[]> {
  const path = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
  const res = await fetchYF(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Historical API error: ${res.status}`);
  const data: YFChartResponse = await res.json();
  const result = data.chart?.result?.[0];
  if (!result) throw new Error('No chart data in response');
  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  return timestamps
    .map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: closes[i],
    }))
    .filter((p): p is HistoricalPoint => p.close != null && p.close > 0);
}

/** Turn raw history + metadata into portfolio snapshots for a single ETF */
export function buildEtfHistory(
  history: HistoricalPoint[],
  shares: number,
  avgBuyPrice: number,
): PortfolioSnapshot[] {
  return history.map((pt) => ({
    date: pt.date,
    totalValue: Math.round(shares * pt.close * 100) / 100,
    totalCost: Math.round(shares * avgBuyPrice * 100) / 100,
  }));
}

/** Combine per-ETF histories into a single portfolio history using common dates */
export function buildPortfolioHistory(
  etfHistories: Record<string, HistoricalPoint[]>,
  etfDefs: DemoEtfDef[],
  avgBuyPrices: Record<string, number>,
): PortfolioSnapshot[] {
  if (etfDefs.length === 0) return [];

  // Build price-lookup maps
  const priceMaps: Record<string, Record<string, number>> = {};
  etfDefs.forEach((def) => {
    priceMaps[def.ticker] = {};
    (etfHistories[def.ticker] ?? []).forEach((p) => {
      priceMaps[def.ticker][p.date] = p.close;
    });
  });

  // Use dates where every ETF has a data point
  const firstTicker = etfDefs[0].ticker;
  const commonDates = (etfHistories[firstTicker] ?? [])
    .map((p) => p.date)
    .filter((date) => etfDefs.every((def) => priceMaps[def.ticker][date] != null))
    .sort();

  return commonDates.map((date) => {
    let totalValue = 0;
    let totalCost = 0;
    etfDefs.forEach((def) => {
      const price = priceMaps[def.ticker][date];
      totalValue += def.shares * price;
      totalCost += def.shares * (avgBuyPrices[def.ticker] ?? price);
    });
    return {
      date,
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  });
}

/** Build Holding objects from ETF definitions + current quotes + avg buy prices */
export function buildHoldings(
  etfDefs: DemoEtfDef[],
  quotes: QuoteResult[],
  avgBuyPrices: Record<string, number>,
): Holding[] {
  const quoteMap: Record<string, QuoteResult> = {};
  quotes.forEach((q) => { quoteMap[q.ticker] = q; });
  return etfDefs.map((def, i) => {
    const quote = quoteMap[def.ticker];
    const quotePrice = quote?.price ?? 0;
    const currency = quote?.currency ?? 'USD';
    const avgBuyPrice = avgBuyPrices[def.ticker] ?? quotePrice;
    const currentPrice = quotePrice > 0 ? quotePrice : avgBuyPrice;
    return {
      id: String(i + 1),
      etfId: def.id,
      ticker: def.ticker,
      name: def.name,
      shares: def.shares,
      avgBuyPrice,
      currentPrice,
      currency,
      sector: def.sector,
    };
  });
}
