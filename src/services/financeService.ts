import { Holding, PortfolioSnapshot, PurchaseLot } from '../types';
import etfsConfig from '../etfs.json';

// ETF definitions — the single source of truth shared with scripts/fetch-finance-data.mjs.
export interface DemoEtfDef {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  shares: number;
  isin?: string;
  wkn?: string;
  lots?: PurchaseLot[];
}

// Loaded from src/etfs.json — the same file read by scripts/fetch-finance-data.mjs
// so adding or renaming a ticker in one place automatically updates the other.
export const DEMO_ETFS: DemoEtfDef[] = etfsConfig as DemoEtfDef[];

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

/** Combine per-ETF histories into a single portfolio history using common dates.
 *
 * @param sharesByTicker   Actual share count per ticker (computed from holdings/lots).
 *                         Falls back to def.shares when not provided.
 * @param costBasisByTicker Actual average buy price per ticker (from holdings).
 *                         Falls back to avgBuyPrices (first historical close) when not provided.
 */
export function buildPortfolioHistory(
  etfHistories: Record<string, HistoricalPoint[]>,
  etfDefs: DemoEtfDef[],
  avgBuyPrices: Record<string, number>,
  sharesByTicker: Record<string, number> = {},
  costBasisByTicker: Record<string, number> = {},
): PortfolioSnapshot[] {
  // Only include ETFs that have a non-zero share count
  const activeDefs = etfDefs.filter(
    (def) => (sharesByTicker[def.ticker] ?? def.shares) > 0,
  );
  if (activeDefs.length === 0) return [];

  // Build price-lookup maps
  const priceMaps: Record<string, Record<string, number>> = {};
  activeDefs.forEach((def) => {
    priceMaps[def.ticker] = {};
    (etfHistories[def.ticker] ?? []).forEach((p) => {
      priceMaps[def.ticker][p.date] = p.close;
    });
  });

  // Only consider ETFs that have historical data; skip those with empty history
  // so that a single failed ticker doesn't blank out the whole chart.
  const etfsWithData = activeDefs.filter((def) => (etfHistories[def.ticker] ?? []).length > 0);
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
    activeDefs.forEach((def) => {
      const shares = sharesByTicker[def.ticker] ?? def.shares;
      const costBasis = costBasisByTicker[def.ticker] ?? avgBuyPrices[def.ticker] ?? 0;
      // Fall back to cost basis (or historical avg) when the price map has no entry for this date
      const priceFallback = costBasis > 0 ? costBasis : (avgBuyPrices[def.ticker] ?? 0);
      const price = priceMaps[def.ticker]?.[date] ?? priceFallback;
      totalValue += shares * price;
      totalCost += shares * costBasis;
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
  rawHistories: Record<string, HistoricalPoint[]> = {},
  importedLotsByIsin: Record<string, PurchaseLot[]> = {},
): Holding[] {
  const quoteMap: Record<string, QuoteResult> = {};
  quotes.forEach((q) => { quoteMap[q.ticker] = q; });
  return etfDefs.map((def, i) => {
    const quote = quoteMap[def.ticker];
    const quotePrice = quote?.price ?? 0;
    const currency = quote?.currency ?? 'EUR';

    // Merge static lots from definition with any CSV-imported lots (by ISIN)
    const staticLots: PurchaseLot[] = (def.lots ?? []).slice();
    const csvLots: PurchaseLot[] = def.isin ? (importedLotsByIsin[def.isin] ?? []) : [];
    const lots: PurchaseLot[] = [...staticLots, ...csvLots]
      .sort((a, b) => a.date.localeCompare(b.date));

    let avgBuyPrice: number;
    if (lots.length > 0) {
      const totalCost = lots.reduce((s, l) => s + l.shares * l.buyPrice, 0);
      const totalLotShares = lots.reduce((s, l) => s + l.shares, 0);
      avgBuyPrice = totalLotShares > 0 ? totalCost / totalLotShares : avgBuyPrices[def.ticker] ?? quotePrice;
    } else {
      avgBuyPrice = avgBuyPrices[def.ticker] ?? quotePrice;
    }

    // Derive total shares: prefer sum of lots when available, fall back to def.shares
    const shares = lots.length > 0
      ? lots.reduce((s, l) => s + l.shares, 0)
      : def.shares;

    const currentPrice = quotePrice > 0 ? quotePrice : avgBuyPrice;
    const history = (rawHistories[def.ticker] ?? []).map((p) => ({ date: p.date, close: p.close }));
    return {
      id: String(i + 1),
      etfId: def.id,
      ticker: def.ticker,
      isin: def.isin,
      wkn: def.wkn,
      name: def.name,
      shares,
      avgBuyPrice,
      currentPrice,
      currency,
      sector: def.sector,
      lots,
      history,
    };
  }).filter((h) => h.shares > 0);
}

