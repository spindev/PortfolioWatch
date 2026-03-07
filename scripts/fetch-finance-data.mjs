/**
 * Fetch market data at build time and write static JSON files to public/data/
 * so the deployed GitHub Pages app can read them as same-origin resources —
 * with no CORS proxy and no third-party accounts required.
 *
 * Current price quotes are fetched from Gettex (Börse München) posttrade
 * delayed data (via ISIN). Yahoo Finance is used as fallback for any ISIN
 * not found on Gettex and as the sole source for 1-year historical data.
 *
 * Run automatically by the GitHub Actions deploy workflow before `npm run build`.
 * ETF definitions (including ISINs) are kept in src/etfs.json.
 */

import { gunzipSync } from 'node:zlib';
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
const GETTEX_LISTING_URL = 'https://www.gettex.de/handel/delayed-data/posttrade-data/';
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

// ─── Gettex (Börse München) posttrade delayed-data helpers ───────────────────

/**
 * Discover the URL of the most recently published Gettex posttrade CSV file
 * for the given market segment ('mund' = Freiverkehr, 'munc' = Reg. Markt).
 * File links are extracted from the Gettex delayed-data listing page.
 */
async function getLatestGettexUrl(marketType) {
  const res = await fetchWithTimeout(GETTEX_LISTING_URL);
  if (!res.ok) throw new Error(`Gettex listing page returned HTTP ${res.status}`);
  const html = await res.text();
  // File URLs are hosted on erdk.bayerische-boerse.de and linked from the page
  const urlRegex = /https?:\/\/erdk\.bayerische-boerse\.de[^\s"'<>]+\.csv\.gz/g;
  const urls = [...html.matchAll(urlRegex)]
    .map((m) => m[0])
    .filter((url) => url.includes(`.${marketType}.`));
  if (urls.length === 0) throw new Error(`No Gettex ${marketType.toUpperCase()} files found in listing`);
  return urls[urls.length - 1]; // most recent entry
}

/**
 * Download a gzipped Gettex posttrade CSV and return the last traded price
 * for each of the requested ISINs.
 *
 * CSV row format (no header): ISIN,TIME,CURRENCY,PRICE,AMOUNT
 * We keep the last row seen per ISIN so we get the most recent trade price.
 */
async function parseGettexCsv(csvUrl, targetIsins) {
  const res = await fetchWithTimeout(csvUrl);
  if (!res.ok) throw new Error(`Gettex CSV download returned HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const text = gunzipSync(buffer).toString('utf8');
  const isinSet = new Set(targetIsins);
  const prices = {};
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    if (parts.length < 4) continue;
    const isin = parts[0].trim();
    if (!isinSet.has(isin)) continue;
    const currency = parts[2].trim() || 'EUR';
    const price = parseFloat(parts[3]);
    if (price > 0) prices[isin] = { price, currency }; // last row wins → newest trade
  }
  return prices;
}

/**
 * Fetch current prices from Gettex for the given ISIN list.
 * Tries both MUND (Freiverkehr) and MUNC (Regulierter Markt) so that each ETF
 * is found regardless of which segment it is traded in on the Munich exchange.
 * Returns a map of ISIN → { price, currency }.
 */
async function fetchGettexPrices(targetIsins) {
  const prices = {};
  for (const marketType of ['mund', 'munc']) {
    try {
      const csvUrl = await getLatestGettexUrl(marketType);
      process.stdout.write(`  Gettex ${marketType.toUpperCase()}...`);
      const marketPrices = await parseGettexCsv(csvUrl, targetIsins);
      const found = Object.keys(marketPrices).length;
      console.log(` ${found}/${targetIsins.length} ISINs found`);
      for (const [isin, data] of Object.entries(marketPrices)) {
        if (!prices[isin]) prices[isin] = data; // first market that has the ISIN wins
      }
    } catch (err) {
      console.warn(`  Gettex ${marketType.toUpperCase()} skipped: ${err.message}`);
    }
  }
  return prices;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch data for a single ticker.
 * If a Gettex price is provided it is used as the current quote; otherwise the
 * quote is fetched from Yahoo Finance. Historical data is always from Yahoo Finance
 * because Gettex only offers current-day snapshots.
 */
async function fetchTicker(ticker, gettexPrice = null) {
  let price, currency;

  if (gettexPrice) {
    price = gettexPrice.price;
    currency = gettexPrice.currency;
  } else {
    // Fallback: fetch the most recent closing price from Yahoo Finance
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
    price = validCloses[validCloses.length - 1] ?? 0;
    currency = quoteResult.meta?.currency ?? 'USD';
  }

  // Historical data always from Yahoo Finance (Gettex has no historical API)
  const histUrl = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
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

  // Build ISIN → ticker mapping from etfs.json
  const isinToTicker = Object.fromEntries(
    etfs.filter((e) => e.isin).map((e) => [e.isin, e.ticker]),
  );
  const targetIsins = Object.keys(isinToTicker);

  // ── Step 1: Fetch current prices from Gettex (primary source) ─────────────
  console.log('Fetching current prices from Gettex (Börse München)...');
  let gettexPricesByIsin = {};
  try {
    gettexPricesByIsin = await fetchGettexPrices(targetIsins);
    const found = Object.keys(gettexPricesByIsin).length;
    if (found > 0) {
      console.log(`Gettex: obtained prices for ${found}/${targetIsins.length} ETFs.`);
    } else {
      console.warn('Gettex: no prices obtained — Yahoo Finance will be used for all quotes.');
    }
  } catch (err) {
    console.warn(`Gettex fetch failed: ${err.message} — falling back to Yahoo Finance.`);
  }

  // ── Step 2: Fetch per-ticker data (quote fallback + 1-year history) ────────
  for (const ticker of TICKERS) {
    const etf = etfs.find((e) => e.ticker === ticker);
    const gettexPrice = etf?.isin ? (gettexPricesByIsin[etf.isin] ?? null) : null;
    const source = gettexPrice ? 'Gettex' : 'YF';

    process.stdout.write(`Fetching ${ticker} [${source}]...`);
    try {
      const { price, currency, history } = await fetchTicker(ticker, gettexPrice);
      quotes.push({ ticker, price, currency });

      const histFile = join(DATA_DIR, `historical-${safeFilename(ticker)}.json`);
      writeFileSync(histFile, JSON.stringify({ updatedAt, ticker, history }, null, 2));

      console.log(` ✓ ${price.toFixed(2)} ${currency}, ${history.length} days history`);
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
