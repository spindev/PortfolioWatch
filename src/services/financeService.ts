import { Holding, PortfolioSnapshot } from '../types';
import etfsConfig from '../etfs.json';

// Demo portfolio: 3 ETFs, 100 shares each
export interface DemoEtfDef {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  shares: number;
}

// Loaded from src/etfs.json — the same file read by scripts/fetch-finance-data.mjs
// so adding or renaming a ticker in one place automatically updates the other.
export const DEMO_ETFS: DemoEtfDef[] = etfsConfig;

// ─── Development: Vite proxy forwards /api/yf → query2.finance.yahoo.com ─────
const YF_DEV_PROXY = '/api/yf';

// ─── Production: static JSON files baked into the build by ───────────────────
//     scripts/fetch-finance-data.mjs (served from the same origin — no CORS).
//     BASE_URL is '/PortfolioWatch/' in production (see vite.config.ts).

const FETCH_TIMEOUT_MS = 15000;

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

function parseQuote(ticker: string, data: YFChartResponse): QuoteResult {
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`No chart data for ${ticker}`);
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const validCloses = closes.filter((c): c is number => c != null && c > 0);
  return {
    ticker,
    price: validCloses[validCloses.length - 1] ?? 0,
    currency: result.meta?.currency ?? 'USD',
  };
}

function parseHistorical(data: YFChartResponse): HistoricalPoint[] {
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

/**
 * Fetch current quotes for the given tickers.
 *
 * - Development: live from Yahoo Finance via the Vite dev proxy.
 * - Production: reads from `data/quotes.json` — a static file baked into the
 *   build by scripts/fetch-finance-data.mjs and served from the same origin.
 *   No CORS proxy or external account is required.
 */
export async function fetchQuotes(tickers: string[]): Promise<QuoteResult[]> {
  if (import.meta.env.DEV) {
    return Promise.all(
      tickers.map(async (ticker): Promise<QuoteResult> => {
        const path = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
        const res = await fetchWithTimeout(`${YF_DEV_PROXY}${path}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`Quote API error: ${res.status}`);
        return parseQuote(ticker, await res.json());
      }),
    );
  }

  // Production: read from pre-fetched static JSON (same-origin, no CORS needed)
  const res = await fetchWithTimeout(`${import.meta.env.BASE_URL}data/quotes.json`);
  if (!res.ok) {
    throw new Error(
      `Failed to load market data (HTTP ${res.status}). ` +
        'Trigger a new deployment to refresh the data.',
    );
  }
  const data: { updatedAt: string; quotes: QuoteResult[] } = await res.json();
  const tickerSet = new Set(tickers);
  return data.quotes.filter((q) => tickerSet.has(q.ticker));
}

/**
 * Fetch 1-year daily historical prices for a single ticker.
 *
 * - Development: live from Yahoo Finance via the Vite dev proxy.
 * - Production: reads from `data/historical-{ticker}.json` — a static file
 *   baked into the build by scripts/fetch-finance-data.mjs.
 */
export async function fetchHistorical(ticker: string): Promise<HistoricalPoint[]> {
  if (import.meta.env.DEV) {
    const path = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
    const res = await fetchWithTimeout(`${YF_DEV_PROXY}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Historical API error: ${res.status}`);
    return parseHistorical(await res.json());
  }

  // Production: read from pre-fetched static JSON (same-origin, no CORS needed)
  const safeTicker = ticker.replace(/[^\w]/g, '_');
  const res = await fetchWithTimeout(
    `${import.meta.env.BASE_URL}data/historical-${safeTicker}.json`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load historical data for ${ticker} (HTTP ${res.status}). ` +
        'Trigger a new deployment to refresh the data.',
    );
  }
  const data: { updatedAt: string; ticker: string; history: HistoricalPoint[] } =
    await res.json();
  return data.history;
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

  // Only consider ETFs that have historical data; skip those with empty history
  // so that a single failed ticker doesn't blank out the whole chart.
  const etfsWithData = etfDefs.filter((def) => (etfHistories[def.ticker] ?? []).length > 0);
  if (etfsWithData.length === 0) return [];

  // Use dates where every ETF *with data* has a data point
  const firstTicker = etfsWithData[0].ticker;
  const commonDates = (etfHistories[firstTicker] ?? [])
    .map((p) => p.date)
    .filter((date) => etfsWithData.every((def) => priceMaps[def.ticker][date] != null))
    .sort();

  return commonDates.map((date) => {
    let totalValue = 0;
    let totalCost = 0;
    etfDefs.forEach((def) => {
      // Fall back to avg buy price for ETFs whose history failed to load
      const price = priceMaps[def.ticker][date] ?? avgBuyPrices[def.ticker] ?? 0;
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

