import { Holding, PortfolioSnapshot, PurchaseLot, SaleLot } from '../types';
import etfsConfig from '../etfs.json';
import { todayIsoString } from '../utils/calculations';

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

export interface QuotesData {
  quotes: QuoteResult[];
  /** ISO timestamp of when the static data file was generated; null in development */
  updatedAt: string | null;
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
 * Apply FIFO (first-in, first-out) to reduce buy lots by the given sale lots.
 * Returns a new array of remaining lots with adjusted share counts.
 * Buy lots must be sorted oldest-first (the caller guarantees this).
 */
export function applyFifoSales(
  buyLots: PurchaseLot[],
  saleLots: SaleLot[],
): PurchaseLot[] {
  if (saleLots.length === 0) return buyLots;

  // Clone lots so we don't mutate the originals
  const queue = buyLots.map((l) => ({ ...l }));
  const totalSold = saleLots.reduce((s, l) => s + l.shares, 0);

  let remaining = totalSold;
  for (let i = 0; i < queue.length && remaining > 0; i++) {
    // Use epsilon tolerance to treat lots as fully consumed when floating-point
    // arithmetic leaves a negligible residual (e.g. 21.0 - 21.0 = 2.2e-16).
    if (queue[i].shares <= remaining + 1e-9) {
      remaining = Math.max(0, remaining - queue[i].shares);
      queue[i].shares = 0;
    } else {
      // Round to 8 decimal places to prevent floating-point drift accumulating
      // across repeated partial deductions.
      queue[i].shares = Math.round((queue[i].shares - remaining) * 1e8) / 1e8;
      remaining = 0;
    }
  }

  // Filter out near-zero lots that are artefacts of floating-point rounding.
  return queue.filter((l) => l.shares > 1e-9);
}

/**
 * Fetch current quotes for the given tickers.
 *
 * - Development: live from Yahoo Finance via the Vite dev proxy.
 * - Production: reads from `data/quotes.json` — a static file baked into the
 *   build by scripts/fetch-finance-data.mjs and served from the same origin.
 *   No CORS proxy or external account is required.
 */
export async function fetchQuotes(tickers: string[]): Promise<QuotesData> {
  if (import.meta.env.DEV) {
    const quotes = await Promise.all(
      tickers.map(async (ticker): Promise<QuoteResult> => {
        const path = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
        const res = await fetchWithTimeout(`${YF_DEV_PROXY}${path}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`Quote API error: ${res.status}`);
        return parseQuote(ticker, await res.json());
      }),
    );
    return { quotes, updatedAt: null };
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
  return {
    quotes: data.quotes.filter((q) => tickerSet.has(q.ticker)),
    updatedAt: data.updatedAt,
  };
}

/**
 * Fetch 5-year daily historical prices for a single ticker.
 *
 * - Development: live from Yahoo Finance via the Vite dev proxy.
 * - Production: reads from `data/historical-{ticker}.json` — a static file
 *   baked into the build by scripts/fetch-finance-data.mjs.
 */
export async function fetchHistorical(ticker: string): Promise<HistoricalPoint[]> {
  if (import.meta.env.DEV) {
    const path = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5y`;
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

/** Per-ticker transaction history used for time-aware portfolio history */
export interface TickerTransactions {
  /** All buy lots for this ticker, sorted oldest-first */
  buyLots: PurchaseLot[];
  /** All sell lots for this ticker, sorted oldest-first */
  saleLots: SaleLot[];
}

/** Combine per-ETF histories into a single portfolio history using common dates.
 *
 * @param sharesByTicker   Actual share count per ticker (computed from holdings/lots).
 *                         Falls back to def.shares when not provided.
 * @param costBasisByTicker Actual average buy price per ticker (from holdings).
 *                         Falls back to avgBuyPrices (first historical close) when not provided.
 * @param transactionsByTicker Full buy/sell history per ticker for time-aware cost basis.
 *                         When provided for a ticker, the chart will correctly reflect the
 *                         position size and cost basis at each point in time (FIFO applied
 *                         per date), rather than projecting today's state back in time.
 */
export function buildPortfolioHistory(
  etfHistories: Record<string, HistoricalPoint[]>,
  etfDefs: DemoEtfDef[],
  avgBuyPrices: Record<string, number>,
  sharesByTicker: Record<string, number> = {},
  costBasisByTicker: Record<string, number> = {},
  transactionsByTicker: Record<string, TickerTransactions> = {},
): PortfolioSnapshot[] {
  // Include ETFs that either have a non-zero current share count OR have buy transactions
  // in their history (so fully-sold ETFs are still shown for the period they were held).
  const activeDefs = etfDefs.filter((def) => {
    if (transactionsByTicker[def.ticker]) {
      return transactionsByTicker[def.ticker].buyLots.length > 0;
    }
    return (sharesByTicker[def.ticker] ?? def.shares) > 0;
  });
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

  // Collect the UNION of all trading dates across every ETF with data.
  // Using intersection (old approach) excluded any date where even one ETF had
  // a gap, which could leave the chart mostly empty.
  const allDatesSet = new Set<string>();
  etfsWithData.forEach((def) => {
    (etfHistories[def.ticker] ?? []).forEach((p) => allDatesSet.add(p.date));
  });
  const allDates = Array.from(allDatesSet).sort();

  // Forward-fill each ETF's price map so that minor single-day gaps are bridged
  // with the last known closing price instead of falling back to cost basis.
  const filledPriceMaps: Record<string, Record<string, number>> = {};
  etfsWithData.forEach((def) => {
    filledPriceMaps[def.ticker] = {};
    let lastPrice: number | undefined;
    for (const date of allDates) {
      const rawPrice = priceMaps[def.ticker][date];
      if (rawPrice != null) lastPrice = rawPrice;
      if (lastPrice != null) filledPriceMaps[def.ticker][date] = lastPrice;
    }
  });

  // Only include dates where every ETF with data has at least a forward-filled
  // price. This naturally excludes dates before the last-listed ETF started
  // trading while still including all trading days after that point.
  const validDates = allDates.filter((date) =>
    etfsWithData.every((def) => filledPriceMaps[def.ticker][date] != null),
  );

  const snapshots: PortfolioSnapshot[] = validDates.map((date) => {
    let totalValue = 0;
    let totalCost = 0;
    activeDefs.forEach((def) => {
      let shares: number;
      let costBasis: number;

      const txns = transactionsByTicker[def.ticker];
      if (txns) {
        // Time-aware: compute the position as it stood on this date using FIFO
        const buysAtDate = txns.buyLots.filter((l) => l.date <= date);
        const salesAtDate = txns.saleLots.filter((l) => l.date <= date);
        const netLots = applyFifoSales(buysAtDate, salesAtDate);
        shares = netLots.reduce((s, l) => s + l.shares, 0);
        const totalLotCost = netLots.reduce((s, l) => s + l.shares * l.buyPrice, 0);
        costBasis = shares > 0 ? totalLotCost / shares : 0;
      } else {
        shares = sharesByTicker[def.ticker] ?? def.shares;
        costBasis = costBasisByTicker[def.ticker] ?? avgBuyPrices[def.ticker] ?? 0;
      }

      // Use forward-filled price; fall back to cost basis only for ETFs with
      // no historical data at all (i.e. not in filledPriceMaps).
      const priceFallback = costBasis > 0 ? costBasis : (avgBuyPrices[def.ticker] ?? 0);
      const price = filledPriceMaps[def.ticker]?.[date] ?? priceFallback;
      totalValue += shares * price;
      totalCost += shares * costBasis;
    });
    return {
      date,
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  });

  // Extend the chart to today when markets are closed (weekends, public holidays).
  // This prevents the chart from ending abruptly on the last trading day and lets
  // the current portfolio value stay visible even on non-trading days.
  const today = todayIsoString();
  if (snapshots.length > 0 && snapshots[snapshots.length - 1].date < today) {
    const last = snapshots[snapshots.length - 1];
    snapshots.push({ date: today, totalValue: last.totalValue, totalCost: last.totalCost });
  }

  return snapshots;
}

/** Build Holding objects from ETF definitions + current quotes + avg buy prices */
export function buildHoldings(
  etfDefs: DemoEtfDef[],
  quotes: QuoteResult[],
  avgBuyPrices: Record<string, number>,
  rawHistories: Record<string, HistoricalPoint[]> = {},
  importedLotsByIsin: Record<string, PurchaseLot[]> = {},
  importedSalesByIsin: Record<string, SaleLot[]> = {},
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
    const allBuyLots: PurchaseLot[] = [...staticLots, ...csvLots]
      .sort((a, b) => a.date.localeCompare(b.date));

    // Apply FIFO: remove sold shares from the oldest buy lots first
    const saleLots: SaleLot[] = def.isin ? (importedSalesByIsin[def.isin] ?? []) : [];
    const lots: PurchaseLot[] = applyFifoSales(allBuyLots, saleLots);

    let avgBuyPrice: number;
    if (lots.length > 0) {
      const totalCost = lots.reduce((s, l) => s + l.shares * l.buyPrice, 0);
      const totalLotShares = lots.reduce((s, l) => s + l.shares, 0);
      avgBuyPrice = totalLotShares > 0 ? totalCost / totalLotShares : avgBuyPrices[def.ticker] ?? quotePrice;
    } else {
      avgBuyPrice = avgBuyPrices[def.ticker] ?? quotePrice;
    }

    // Derive total shares: prefer sum of remaining lots when available, fall back to def.shares
    const shares = allBuyLots.length > 0
      ? lots.reduce((s, l) => s + l.shares, 0)
      : def.shares;

    const history = (rawHistories[def.ticker] ?? []).map((p) => ({ date: p.date, close: p.close }));
    const lastHistoricalClose = history.length > 0 ? history[history.length - 1].close : 0;
    // Determine the best available price for this holding, in order of preference:
    //   1. Live quote  (most up-to-date)
    //   2. Last historical close  (keeps gain/loss meaningful when quotes.json is
    //      stale — e.g. after a ticker rename from .MU → .DE before the static
    //      data files are regenerated via scripts/fetch-finance-data.mjs)
    //   3. Average buy price  (last resort — produces 0 gain, but is never stale)
    let currentPrice: number;
    if (quotePrice > 0) {
      currentPrice = quotePrice;
    } else if (lastHistoricalClose > 0) {
      currentPrice = lastHistoricalClose;
    } else {
      currentPrice = avgBuyPrice;
    }
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

