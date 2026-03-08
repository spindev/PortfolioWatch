import React from 'react';
import { QuoteResult, HistoricalPoint, DemoEtfDef } from '../services/financeService';
import { formatCurrency } from '../utils/calculations';

const LOCALE = 'de-DE';

interface MarketDataPageProps {
  etfDefs: DemoEtfDef[];
  quotes: QuoteResult[];
  histories: Record<string, HistoricalPoint[]>;
  updatedAt: string | null;
  onClose: () => void;
}

function formatDate(isoDate: string): string {
  // Use T12:00:00 to avoid UTC-to-local-midnight shift that would display the wrong calendar date.
  return new Date(isoDate + 'T12:00:00').toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const MarketDataPage: React.FC<MarketDataPageProps> = ({
  etfDefs,
  quotes,
  histories,
  updatedAt,
  onClose,
}) => {
  const quoteMap = React.useMemo(() => {
    const m: Record<string, QuoteResult> = {};
    quotes.forEach((q) => { m[q.ticker] = q; });
    return m;
  }, [quotes]);

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Kursdaten</h2>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">
              Abgerufene Marktdaten der ETF-Positionen
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-4 flex-shrink-0"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Data freshness note */}
        {updatedAt && (
          <div className="px-5 py-3 bg-gray-50 dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
            Datenstand:{' '}
            {new Date(updatedAt).toLocaleString(LOCALE, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Berlin',
            })}{' '}
            Uhr
          </div>
        )}

        {/* Table — desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Ticker</th>
                <th className="px-5 py-3 font-medium">ISIN / WKN</th>
                <th className="px-5 py-3 font-medium text-right">Aktueller Kurs</th>
                <th className="px-5 py-3 font-medium text-right">Handelstage</th>
                <th className="px-5 py-3 font-medium">Erster Kurs</th>
                <th className="px-5 py-3 font-medium">Letzter Kurs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {etfDefs.map((def) => {
                const quote = quoteMap[def.ticker];
                const history = histories[def.ticker] ?? [];
                const firstDate = history.length > 0 ? history[0].date : null;
                const lastDate = history.length > 0 ? history[history.length - 1].date : null;
                return (
                  <tr key={def.ticker} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3 text-gray-900 dark:text-white font-medium max-w-[200px] truncate" title={def.name}>
                      {def.name}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-slate-300 font-mono text-xs">
                      {def.ticker}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-slate-400 font-mono text-xs">
                      {def.isin
                        ? `${def.isin}${def.wkn ? ` / ${def.wkn}` : ''}`
                        : <span className="text-gray-400 dark:text-slate-500">–</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-right text-gray-900 dark:text-white tabular-nums">
                      {quote
                        ? formatCurrency(quote.price, quote.currency, LOCALE)
                        : <span className="text-gray-400 dark:text-slate-500">–</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700 dark:text-slate-300 tabular-nums">
                      {history.length > 0 ? history.length : <span className="text-gray-400 dark:text-slate-500">–</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-slate-400">
                      {firstDate ? formatDate(firstDate) : <span className="text-gray-400 dark:text-slate-500">–</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-slate-400">
                      {lastDate ? formatDate(lastDate) : <span className="text-gray-400 dark:text-slate-500">–</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Card layout — mobile */}
        <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700/50">
          {etfDefs.map((def) => {
            const quote = quoteMap[def.ticker];
            const history = histories[def.ticker] ?? [];
            const firstDate = history.length > 0 ? history[0].date : null;
            const lastDate = history.length > 0 ? history[history.length - 1].date : null;
            return (
              <div key={def.ticker} className="px-5 py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{def.name}</p>
                    <p className="text-gray-500 dark:text-slate-400 text-xs font-mono mt-0.5">{def.ticker}</p>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium text-sm tabular-nums flex-shrink-0">
                    {quote ? formatCurrency(quote.price, quote.currency, LOCALE) : '–'}
                  </p>
                </div>
                {def.isin && (
                  <p className="text-gray-500 dark:text-slate-400 text-xs font-mono">
                    {def.isin}{def.wkn && ` / ${def.wkn}`}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-gray-500 dark:text-slate-400">
                  <span>{history.length} Handelstage</span>
                  {firstDate && <span>ab {formatDate(firstDate)}</span>}
                  {lastDate && <span>bis {formatDate(lastDate)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
