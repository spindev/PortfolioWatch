/**
 * Fetch Yahoo Finance market data at build time and write static JSON files
 * to public/data/ so the deployed GitHub Pages app can read them as same-origin
 * resources — with no CORS proxy and no third-party accounts required.
 *
 * Run automatically by the GitHub Actions deploy workflow before `npm run build`.
 * Tickers are kept in sync with DEMO_ETFS in src/services/financeService.ts.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

// Load tickers from src/etfs.json — the single source of truth shared with
// src/services/financeService.ts. Add or rename a ticker there and this script
// automatically picks it up on the next deployment.
const etfs = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'etfs.json'), 'utf8'));
const TICKERS = etfs.map((e) => e.ticker);

const YF_BASE = 'https://query2.finance.yahoo.com';
const FETCH_TIMEOUT_MS = 20000;
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

/** Sanitize a ticker symbol for use as a filename component */
function safeFilename(ticker) {
  return ticker.replace(/[^\w]/g, '_');
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchTicker(ticker) {
  // Fetch the most recent closing price (last 5 trading days)
  const quoteUrl = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const quoteRes = await fetchWithTimeout(quoteUrl);
  if (!quoteRes.ok) {
    throw new Error(`Quote fetch failed for ${ticker}: HTTP ${quoteRes.status}`);
  }
  const quoteData = await quoteRes.json();
  const quoteResult = quoteData.chart?.result?.[0];
  if (!quoteResult) throw new Error(`No chart data returned for ${ticker}`);

  const closes = quoteResult.indicators?.quote?.[0]?.close ?? [];
  const validCloses = closes.filter((c) => c != null && c > 0);
  const price = validCloses[validCloses.length - 1] ?? 0;
  const currency = quoteResult.meta?.currency ?? 'USD';

  // Fetch 5 years of daily historical prices
  const histUrl = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5y`;
  const histRes = await fetchWithTimeout(histUrl);
  if (!histRes.ok) {
    throw new Error(`Historical fetch failed for ${ticker}: HTTP ${histRes.status}`);
  }
  const histData = await histRes.json();
  const histResult = histData.chart?.result?.[0];
  if (!histResult) throw new Error(`No historical data returned for ${ticker}`);

  const timestamps = histResult.timestamp ?? [];
  const histCloses = histResult.indicators?.quote?.[0]?.close ?? [];
  const history = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: histCloses[i],
    }))
    .filter((p) => p.close != null && p.close > 0);

  return { ticker, price, currency, history };
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const updatedAt = new Date().toISOString();
  const quotes = [];
  let failCount = 0;

  for (const ticker of TICKERS) {
    process.stdout.write(`Fetching ${ticker}...`);
    try {
      const { price, currency, history } = await fetchTicker(ticker);
      quotes.push({ ticker, price, currency });

      const histFile = join(DATA_DIR, `historical-${safeFilename(ticker)}.json`);
      writeFileSync(histFile, JSON.stringify({ updatedAt, ticker, history }, null, 2));

      console.log(` ✓ ${price.toFixed(2)} ${currency}, ${history.length} days`);
    } catch (err) {
      console.error(` ✗ ${err.message}`);
      failCount++;
    }
  }

  if (quotes.length === 0) {
    console.error('All tickers failed — aborting to preserve previous deployment data.');
    process.exit(1);
  }

  writeFileSync(
    join(DATA_DIR, 'quotes.json'),
    JSON.stringify({ updatedAt, quotes }, null, 2),
  );

  if (failCount > 0) {
    console.warn(`Warning: ${failCount} ticker(s) failed. Partial data written.`);
  } else {
    console.log(`Done. All ${TICKERS.length} tickers updated at ${updatedAt}`);
  }
}

main().catch((err) => {
  console.error('fetch-finance-data failed:', err);
  process.exit(1);
});
