import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { PortfolioChart } from './components/PortfolioChart';
import { HoldingsTable } from './components/HoldingsTable';
import { SettingsPage } from './components/SettingsPage';
import { CsvImportModal } from './components/CsvImportModal';
import {
  DEMO_ETFS,
  fetchQuotes,
  fetchHistorical,
  buildHoldings,
  buildPortfolioHistory,
  type HistoricalPoint,
  type TickerTransactions,
} from './services/financeService';
import { getSettings, saveSettings } from './services/settingsService';
import { getImportedLots, saveImportedLots, getImportedSales, saveImportedSales } from './services/importedLotsService';
import { parseBrokerCsv } from './utils/csvParser';
import {
  calculateTotalValue,
  calculateTotalCost,
  calculateTotalGain,
  calculateTotalGainPercent,
  formatCurrency,
  formatPercent,
} from './utils/calculations';
import { Holding, PortfolioSnapshot, PurchaseLot, SaleLot, Settings } from './types';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';
type Page = 'portfolio' | 'settings';

const TIME_RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

function App() {
  const [page, setPage] = useState<Page>('portfolio');
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);

  const [settings, setSettings] = useState<Settings>(getSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // CSV import state
  const importedLotsRef = useRef<Record<string, PurchaseLot[]>>(getImportedLots());
  const importedSalesRef = useRef<Record<string, SaleLot[]>>(getImportedSales());
  const [csvImportLots, setCsvImportLots] = useState<import('./utils/csvParser').CsvLot[] | null>(null);

  const isDark = settings.theme === 'dark';

  // Keep the <html> element in sync with the current theme so Tailwind's
  // `dark:` variants work correctly (they require `.dark` on an ancestor).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  /** One-time load: fetch 1-year history + first set of prices */
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tickers = DEMO_ETFS.map((e) => e.ticker);

      // Fetch historical data for all ETFs in parallel
      const historicalResults = await Promise.all(
        tickers.map((ticker) => fetchHistorical(ticker).catch(() => [] as HistoricalPoint[]))
      );
      const rawHistories: Record<string, HistoricalPoint[]> = {};
      tickers.forEach((ticker, i) => { rawHistories[ticker] = historicalResults[i]; });

      // Use the first historical close price as the avg buy price
      const avgBuyPrices: Record<string, number> = {};
      DEMO_ETFS.forEach((def) => {
        const history = rawHistories[def.ticker];
        avgBuyPrices[def.ticker] = history.length > 0 ? history[0].close : 0;
      });

      // Fetch current quotes
      const quotes = await fetchQuotes(tickers);

      // Build state — merge in any CSV-imported lots from the ref
      const newHoldings = buildHoldings(DEMO_ETFS, quotes, avgBuyPrices, rawHistories, importedLotsRef.current, importedSalesRef.current);

      // Build time-aware transaction history per ticker for the portfolio chart
      const transactionsByTicker: Record<string, TickerTransactions> = {};
      DEMO_ETFS.forEach((def) => {
        const staticLots = (def.lots ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
        const csvBuyLots = def.isin ? (importedLotsRef.current[def.isin] ?? []) : [];
        const csvSaleLots = def.isin ? (importedSalesRef.current[def.isin] ?? []) : [];
        const allBuyLots = [...staticLots, ...csvBuyLots].sort((a, b) => a.date.localeCompare(b.date));
        const allSaleLots = [...csvSaleLots].sort((a, b) => a.date.localeCompare(b.date));
        if (allBuyLots.length > 0 || allSaleLots.length > 0) {
          transactionsByTicker[def.ticker] = { buyLots: allBuyLots, saleLots: allSaleLots };
        }
      });

      // Derive per-ticker shares and actual cost basis from the computed holdings
      // so the portfolio chart reflects real imported data, not the static config.
      const sharesByTicker: Record<string, number> = {};
      const costBasisByTicker: Record<string, number> = {};
      newHoldings.forEach((h) => {
        sharesByTicker[h.ticker] = h.shares;
        costBasisByTicker[h.ticker] = h.avgBuyPrice;
      });

      const newPortfolioHistory = buildPortfolioHistory(rawHistories, DEMO_ETFS, avgBuyPrices, sharesByTicker, costBasisByTicker, transactionsByTicker);

      setHoldings(newHoldings);
      setPortfolioHistory(newPortfolioHistory);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Daten konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSaveSettings = (s: Settings) => {
    saveSettings(s);
    setSettings(s);
  };

  /** Read a file as text with the given encoding */
  const readFileAsText = (file: File, encoding: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) ?? '');
      reader.onerror = reject;
      reader.readAsText(file, encoding);
    });

  /** Parse a selected CSV file and open the import confirmation modal */
  const handleCsvUpload = async (file: File) => {
    // Build ISIN/WKN sets from etfs.json for pre-filtering (computed once, reused for both encoding attempts)
    const knownIsins = new Set(DEMO_ETFS.map((e) => e.isin).filter(Boolean) as string[]);
    const knownWkns = new Set(DEMO_ETFS.map((e) => e.wkn).filter(Boolean) as string[]);

    /** Parse raw CSV text and keep only lots matching a known ETF by ISIN or WKN */
    const parseAndFilter = (text: string) =>
      parseBrokerCsv(text).filter(
        (l) => knownIsins.has(l.isin) || (l.wkn && knownWkns.has(l.wkn)),
      );

    // Try UTF-8 first; fall back to windows-1252 (common for German broker exports —
    // the ü in column names like "Ausführung Datum" gets garbled when read as UTF-8)
    let filtered = parseAndFilter(await readFileAsText(file, 'UTF-8'));
    if (filtered.length === 0) {
      filtered = parseAndFilter(await readFileAsText(file, 'windows-1252'));
    }

    setCsvImportLots(filtered);
  };

  /** Called when the user confirms their ISIN selection in the modal */
  const handleImportConfirm = (selectedByIsin: Record<string, PurchaseLot[]>, salesByIsin: Record<string, SaleLot[]>) => {
    // Merge buy lots
    const mergedLots: Record<string, PurchaseLot[]> = { ...importedLotsRef.current };
    Object.entries(selectedByIsin).forEach(([isin, newLots]) => {
      const existing = mergedLots[isin] ?? [];
      // Deduplicate: skip lots that already exist (same date, shares, buyPrice)
      const isoDuplicate = (a: PurchaseLot, b: PurchaseLot) =>
        a.date === b.date && a.shares === b.shares && a.buyPrice === b.buyPrice;
      const unique = newLots.filter((nl) => !existing.some((el) => isoDuplicate(el, nl)));
      mergedLots[isin] = [...existing, ...unique];
    });
    importedLotsRef.current = mergedLots;
    saveImportedLots(mergedLots);

    // Merge sell lots
    const mergedSales: Record<string, SaleLot[]> = { ...importedSalesRef.current };
    Object.entries(salesByIsin).forEach(([isin, newSales]) => {
      const existing = mergedSales[isin] ?? [];
      // Deduplicate: skip sales that already exist (same date, shares)
      const isoDuplicate = (a: SaleLot, b: SaleLot) =>
        a.date === b.date && a.shares === b.shares;
      const unique = newSales.filter((ns) => !existing.some((es) => isoDuplicate(es, ns)));
      mergedSales[isin] = [...existing, ...unique];
    });
    importedSalesRef.current = mergedSales;
    saveImportedSales(mergedSales);

    setCsvImportLots(null);
    loadInitialData();
  };

  const totalValue = calculateTotalValue(holdings);
  const totalCost = calculateTotalCost(holdings);
  const totalGain = calculateTotalGain(holdings);
  const totalGainPercent = calculateTotalGainPercent(holdings);
  const isPositive = totalGain >= 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <Header
        page={page}
        onNavigate={setPage}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        hasError={!!error && !lastUpdated}
        onCsvUpload={handleCsvUpload}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <>
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700 rounded-xl px-5 py-3 flex items-center gap-3">
              <svg className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
              <button onClick={loadInitialData} className="ml-auto text-red-600 dark:text-red-300 hover:text-red-900 dark:hover:text-white text-xs underline">
                Erneut versuchen
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 dark:text-slate-400 text-sm">Lade Kurse von Yahoo Finance…</p>
            </div>
          ) : !isLoading && holdings.length === 0 ? (
            /* Empty portfolio — prompt the user to upload a CSV */
            <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Portfolio leer</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 max-w-xs">
                  Importiere deine Käufe über den CSV-Upload-Button in der Kopfzeile.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  title="Portfoliowert"
                  value={formatCurrency(totalValue, CURRENCY, LOCALE)}
                  subtitle={`${holdings.length} ETFs`}
                  positive={null}
                />
                <StatCard
                  title="Gesamtkosten"
                  value={formatCurrency(totalCost, CURRENCY, LOCALE)}
                  subtitle="Investiertes Kapital"
                  positive={null}
                />
                <StatCard
                  title="Gesamtgewinn"
                  value={formatCurrency(totalGain, CURRENCY, LOCALE)}
                  subtitle="Absoluter Gewinn"
                  positive={isPositive}
                />
                <StatCard
                  title="Gesamtrendite"
                  value={formatPercent(totalGainPercent)}
                  subtitle="Prozentuale Rendite"
                  positive={isPositive}
                />
              </div>

              {/* Portfolio Development Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <div>
                    <h2 className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg">Portfolio-Entwicklung</h2>
                    <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">Wert vs. Kostenbasis über die Zeit</p>
                  </div>
                  <div className="flex gap-1">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-2 sm:px-3 py-1 text-xs rounded-md transition-colors ${
                          timeRange === range
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
                <PortfolioChart data={portfolioHistory} timeRange={timeRange} />
              </div>

              {/* Holdings Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
                <div className="mb-4 sm:mb-5">
                  <h2 className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg">Positionen</h2>
                  <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">Alle ETF-Positionen und Performance</p>
                </div>
                <HoldingsTable
                  holdings={holdings}
                />
              </div>

              {/* Footer */}
              <footer className="text-center text-gray-400 dark:text-slate-500 text-xs pb-4">
                PortfolioWatch — Kurse via Yahoo Finance
              </footer>
            </>
          )}
        </>
      </main>

      {/* Settings overlay – rendered on top of portfolio content */}
      {page === 'settings' && (
        <SettingsPage settings={settings} onSave={handleSaveSettings} onClose={() => setPage('portfolio')} />
      )}

      {/* CSV import modal – shown after a CSV file is selected */}
      {csvImportLots !== null && (
        <CsvImportModal
          lots={csvImportLots}
          knownEtfs={DEMO_ETFS}
          onConfirm={handleImportConfirm}
          onClose={() => setCsvImportLots(null)}
        />
      )}
    </div>
  );
}

export default App;
