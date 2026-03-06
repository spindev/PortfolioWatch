import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { PortfolioChart } from './components/PortfolioChart';
import { AllocationChart } from './components/AllocationChart';
import { HoldingsTable } from './components/HoldingsTable';
import { SettingsPage } from './components/SettingsPage';
import {
  DEMO_ETFS,
  fetchQuotes,
  fetchHistorical,
  buildHoldings,
  buildEtfHistory,
  buildPortfolioHistory,
  type HistoricalPoint,
} from './services/financeService';
import { getSettings, saveSettings } from './services/settingsService';
import {
  calculateTotalValue,
  calculateTotalCost,
  calculateTotalGain,
  calculateTotalGainPercent,
  formatCurrency,
  formatPercent,
} from './utils/calculations';
import { Holding, PortfolioSnapshot, Settings } from './types';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';
type Page = 'portfolio' | 'settings';

const TIME_RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

function App() {
  const [page, setPage] = useState<Page>('portfolio');
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);
  const [etfHistories, setEtfHistories] = useState<Record<string, PortfolioSnapshot[]>>({});

  const [settings, setSettings] = useState<Settings>(getSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Keep avgBuyPrices stable across refreshes
  const avgBuyPricesRef = useRef<Record<string, number>>({});

  /** One-time load: fetch 1-year history + first set of prices */
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tickers = DEMO_ETFS.map((e) => e.ticker);

      // Fetch historical data for all ETFs in parallel
      const historicalResults = await Promise.all(
        tickers.map((t) => fetchHistorical(t).catch(() => [] as HistoricalPoint[]))
      );
      const rawHistories: Record<string, HistoricalPoint[]> = {};
      tickers.forEach((t, i) => { rawHistories[t] = historicalResults[i]; });

      // Use the first historical close price as the avg buy price
      const avgBuyPrices: Record<string, number> = {};
      DEMO_ETFS.forEach((def) => {
        const history = rawHistories[def.ticker];
        avgBuyPrices[def.ticker] = history.length > 0 ? history[0].close : 0;
      });
      avgBuyPricesRef.current = avgBuyPrices;

      // Fetch current quotes
      const quotes = await fetchQuotes(tickers);

      // Build state
      const newHoldings = buildHoldings(DEMO_ETFS, quotes, avgBuyPrices);
      const newPortfolioHistory = buildPortfolioHistory(rawHistories, DEMO_ETFS, avgBuyPrices);
      const newEtfHistories: Record<string, PortfolioSnapshot[]> = {};
      DEMO_ETFS.forEach((def) => {
        newEtfHistories[def.ticker] = buildEtfHistory(
          rawHistories[def.ticker] ?? [],
          def.shares,
          avgBuyPrices[def.ticker] ?? 0,
        );
      });

      setHoldings(newHoldings);
      setPortfolioHistory(newPortfolioHistory);
      setEtfHistories(newEtfHistories);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Periodic refresh: only update current prices */
  const refreshPrices = useCallback(async () => {
    if (Object.keys(avgBuyPricesRef.current).length === 0) return; // not initialized yet
    try {
      const tickers = DEMO_ETFS.map((e) => e.ticker);
      const quotes = await fetchQuotes(tickers);
      setHoldings((prev) =>
        prev.map((h) => {
          const q = quotes.find((r) => r.ticker === h.ticker);
          return q ? { ...h, currentPrice: q.price } : h;
        })
      );
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      // Keep existing data, just show error
      setError(err instanceof Error ? err.message : 'Price refresh failed');
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const ms = settings.refreshInterval * 1000;
    const id = setInterval(refreshPrices, ms);
    return () => clearInterval(id);
  }, [settings.refreshInterval, refreshPrices]);

  const handleSaveSettings = (s: Settings) => {
    saveSettings(s);
    setSettings(s);
  };

  const totalValue = calculateTotalValue(holdings);
  const totalCost = calculateTotalCost(holdings);
  const totalGain = calculateTotalGain(holdings);
  const totalGainPercent = calculateTotalGainPercent(holdings);
  const isPositive = totalGain >= 0;

  const selectedHolding = selectedTicker
    ? holdings.find((h) => h.ticker === selectedTicker) ?? null
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        page={page}
        onNavigate={setPage}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        hasError={!!error && !lastUpdated}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {page === 'settings' ? (
          <SettingsPage settings={settings} onSave={handleSaveSettings} onClose={() => setPage('portfolio')} />
        ) : (
          <>
            {/* Error banner */}
            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl px-5 py-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-300 text-sm">{error}</span>
                <button onClick={loadInitialData} className="ml-auto text-red-300 hover:text-white text-xs underline">
                  Retry
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && holdings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Fetching live prices from Yahoo Finance…</p>
              </div>
            ) : (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard
                    title="Portfolio Value"
                    value={formatCurrency(totalValue)}
                    subtitle={`${holdings.length} ETFs`}
                    positive={null}
                  />
                  <StatCard
                    title="Total Cost"
                    value={formatCurrency(totalCost)}
                    subtitle="Invested capital"
                    positive={null}
                  />
                  <StatCard
                    title="Total Gain"
                    value={formatCurrency(totalGain)}
                    subtitle="Absolute return"
                    positive={isPositive}
                  />
                  <StatCard
                    title="Total Return"
                    value={formatPercent(totalGainPercent)}
                    subtitle="Percentage return"
                    positive={isPositive}
                  />
                </div>

                {/* Portfolio Development Chart */}
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-white font-semibold text-lg">Portfolio Development</h2>
                      <p className="text-slate-400 text-xs mt-0.5">Value vs. Cost Basis over time</p>
                    </div>
                    <div className="flex gap-1">
                      {TIME_RANGES.map((range) => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            timeRange === range
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                  <PortfolioChart data={portfolioHistory} timeRange={timeRange} />
                </div>

                {/* Per-ETF Development (shown when an ETF is selected) */}
                {selectedHolding && etfHistories[selectedHolding.ticker] && (
                  <div className="bg-slate-800 rounded-xl p-5 border border-blue-700/50">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide">ETF Detail</span>
                        </div>
                        <h2 className="text-white font-semibold text-lg">{selectedHolding.ticker} — {selectedHolding.name}</h2>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {selectedHolding.shares} shares · Current: {formatCurrency(selectedHolding.currentPrice, selectedHolding.currency)} ·
                          Sector: {selectedHolding.sector}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTicker(null)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Close detail view"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <PortfolioChart
                      data={etfHistories[selectedHolding.ticker]}
                      timeRange={timeRange}
                    />
                  </div>
                )}

                {/* Allocation by ETF Chart */}
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <h2 className="text-white font-semibold text-lg mb-1">Allocation by ETF</h2>
                  <p className="text-slate-400 text-xs mb-4">Portfolio weight per position</p>
                  <AllocationChart holdings={holdings} />
                </div>

                {/* Holdings Table */}
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <div className="mb-5">
                    <h2 className="text-white font-semibold text-lg">Holdings</h2>
                    <p className="text-slate-400 text-xs mt-0.5">All ETF positions and performance</p>
                  </div>
                  <HoldingsTable
                    holdings={holdings}
                    selectedTicker={selectedTicker}
                    onSelect={setSelectedTicker}
                  />
                </div>

                {/* Footer */}
                <footer className="text-center text-slate-500 text-xs pb-4">
                  PortfolioWatch — Live prices via Yahoo Finance · Auto-refresh every {settings.refreshInterval}s
                </footer>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
