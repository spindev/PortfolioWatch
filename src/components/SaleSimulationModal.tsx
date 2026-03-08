import React, { useState, useMemo } from 'react';
import { Holding, SaleSimulationResult } from '../types';
import {
  formatCurrency,
  formatPercent,
  formatShares,
  simulateFifoSale,
  sharesForTargetGain,
} from '../utils/calculations';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

// ─── German Saver's Allowance (Sparerpauschbetrag) ────────────────────────────
const SPARERPAUSCHBETRAG = 1000;

// Tolerance for currency comparisons (half a cent) to absorb floating-point
// rounding that arises from proportional gain distribution calculations.
const CURRENCY_EPSILON = 0.005;

interface SaleSimulationModalProps {
  holdings: Holding[];
  /** If provided, the modal opens in single-ETF mode pre-selecting this holding */
  initialHolding?: Holding;
  onClose: () => void;
}

type SimMode = 'etf' | 'portfolio';
type InputMode = 'shares' | 'gain';

// ─── Summary cards ────────────────────────────────────────────────────────────
const SummaryCards: React.FC<{ result: SaleSimulationResult; salePrice: number }> = ({
  result,
}) => {
  const isGain = result.totalGain >= 0;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
      {[
        { label: 'Anteile', value: formatShares(result.totalShares) },
        { label: 'Erlös', value: formatCurrency(result.totalProceeds, CURRENCY, LOCALE) },
        { label: 'Kosten', value: formatCurrency(result.totalCost, CURRENCY, LOCALE) },
        {
          label: 'Gewinn/Verlust',
          value: (result.totalGain >= 0 ? '+' : '') + formatCurrency(result.totalGain, CURRENCY, LOCALE),
          colored: true,
          positive: isGain,
        },
      ].map(({ label, value, colored, positive }) => (
        <div
          key={label}
          className="bg-gray-50 dark:bg-slate-900/40 rounded-lg p-3 border border-gray-200 dark:border-slate-700"
        >
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{label}</p>
          <p
            className={`text-sm font-semibold ${
              colored
                ? positive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
};

// ─── FIFO breakdown table (desktop) ──────────────────────────────────────────
const FifoTable: React.FC<{ result: SaleSimulationResult }> = ({ result }) => {
  if (result.soldLots.length === 0) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
        FIFO-Aufschlüsselung — älteste Käufe werden zuerst verkauft
      </p>
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
            <th className="text-left py-2 px-2">Kaufdatum</th>
            <th className="text-right py-2 px-2">Anteile</th>
            <th className="text-right py-2 px-2">Kaufkurs</th>
            <th className="text-right py-2 px-2">Kaufwert</th>
            <th className="text-right py-2 px-2">Erlös</th>
            <th className="text-right py-2 px-2">G/V</th>
            <th className="text-right py-2 px-2">G/V %</th>
          </tr>
        </thead>
        <tbody>
          {result.soldLots.map((lot, i) => {
            const isPos = lot.gain >= 0;
            return (
              <tr
                key={i}
                className="border-b border-gray-100 dark:border-slate-700/50 last:border-0"
              >
                <td className="py-2.5 px-2 text-gray-700 dark:text-slate-300">
                  {new Date(lot.date).toLocaleDateString(LOCALE)}
                </td>
                <td className="text-right py-2.5 px-2 text-gray-700 dark:text-slate-300">
                  {formatShares(lot.shares)}
                </td>
                <td className="text-right py-2.5 px-2 text-gray-700 dark:text-slate-300">
                  {formatCurrency(lot.buyPrice, CURRENCY, LOCALE)}
                </td>
                <td className="text-right py-2.5 px-2 text-gray-700 dark:text-slate-300">
                  {formatCurrency(lot.cost, CURRENCY, LOCALE)}
                </td>
                <td className="text-right py-2.5 px-2 font-medium text-gray-900 dark:text-white">
                  {formatCurrency(lot.proceeds, CURRENCY, LOCALE)}
                </td>
                <td
                  className={`text-right py-2.5 px-2 font-medium ${
                    isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {isPos ? '+' : ''}
                  {formatCurrency(lot.gain, CURRENCY, LOCALE)}
                </td>
                <td
                  className={`text-right py-2.5 px-2 font-medium ${
                    isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatPercent(lot.gainPct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Tax hint banner ──────────────────────────────────────────────────────────
const TaxHint: React.FC<{ totalGain: number }> = ({ totalGain }) => {
  if (totalGain <= 0) return null;
  // Use CURRENCY_EPSILON to treat floating-point results right at the boundary
  // (e.g. from proportional distribution) as within the allowance.
  const withinAllowance = totalGain <= SPARERPAUSCHBETRAG + CURRENCY_EPSILON;
  const remaining = SPARERPAUSCHBETRAG - totalGain;
  return (
    <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
      <p className="font-semibold mb-0.5">💡 Steuerlicher Hinweis</p>
      {withinAllowance ? (
        <p>
          Dieser Gewinn von{' '}
          <strong>{formatCurrency(totalGain, CURRENCY, LOCALE)}</strong> liegt
          innerhalb des Sparerpauschbetrags (1.000 € / Jahr).{' '}
          {remaining > CURRENCY_EPSILON && (
            <>
              Noch{' '}
              <strong>{formatCurrency(remaining, CURRENCY, LOCALE)}</strong>{' '}
              Spielraum bis zum Freibetrag.
            </>
          )}
        </p>
      ) : (
        <p>
          Der Gewinn von{' '}
          <strong>{formatCurrency(totalGain, CURRENCY, LOCALE)}</strong>{' '}
          übersteigt den Sparerpauschbetrag (1.000 € / Jahr) um{' '}
          <strong>
            {formatCurrency(totalGain - SPARERPAUSCHBETRAG, CURRENCY, LOCALE)}
          </strong>
          . Der überschreitende Betrag unterliegt der Abgeltungsteuer (25 % + Soli).
        </p>
      )}
    </div>
  );
};

// ─── Single-ETF simulation panel ─────────────────────────────────────────────
const EtfSimPanel: React.FC<{ holding: Holding }> = ({ holding }) => {
  const [inputMode, setInputMode] = useState<InputMode>('gain');
  const [rawValue, setRawValue] = useState<string>('');

  const parsedValue = parseFloat(rawValue.replace(',', '.'));
  const isValid = !isNaN(parsedValue) && parsedValue > 0;

  const sharesToSell = useMemo(() => {
    if (!isValid) return 0;
    if (inputMode === 'shares') return parsedValue;
    return sharesForTargetGain(holding.lots, holding.currentPrice, parsedValue);
  }, [inputMode, parsedValue, isValid, holding.lots, holding.currentPrice]);

  const result = useMemo(
    () => simulateFifoSale(holding.lots, holding.currentPrice, sharesToSell),
    [holding.lots, holding.currentPrice, sharesToSell],
  );

  const setPreset = (gain: number) => {
    setInputMode('gain');
    setRawValue(gain.toFixed(2).replace('.', ','));
  };

  return (
    <div>
      {/* ETF info row */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg border border-gray-200 dark:border-slate-700">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{holding.ticker}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[220px]">{holding.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-slate-400">Aktuell</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(holding.currentPrice, CURRENCY, LOCALE)}
          </p>
        </div>
      </div>

      {/* Input mode toggle */}
      <div className="flex items-center gap-2 mb-3">
        {(['shares', 'gain'] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setInputMode(m); setRawValue(''); }}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              inputMode === m
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            {m === 'shares' ? 'Anzahl Anteile' : 'Zielgewinn (€)'}
          </button>
        ))}
      </div>

      {/* Input field */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          inputMode="decimal"
          value={rawValue}
          placeholder={inputMode === 'shares' ? 'z. B. 10,5' : 'z. B. 1.000,00'}
          onChange={(e) => setRawValue(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-slate-500"
        />
        {inputMode === 'gain' && (
          <span className="text-sm text-gray-500 dark:text-slate-400">€</span>
        )}
      </div>

      {/* Preset buttons for Zielgewinn mode */}
      {inputMode === 'gain' && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[500, 1000, 2000].map((v) => (
            <button
              key={v}
              onClick={() => setPreset(v)}
              className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              {formatCurrency(v, CURRENCY, LOCALE)}
            </button>
          ))}
          <button
            onClick={() => setPreset(SPARERPAUSCHBETRAG)}
            className="px-2.5 py-1 text-xs rounded-md border border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            Freibetrag (1.000 €)
          </button>
        </div>
      )}

      {/* Insufficient shares warning */}
      {isValid && !result.sufficientShares && (
        <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
          ⚠ Nicht genügend Anteile vorhanden. Es werden alle{' '}
          {formatShares(result.totalShares)} Anteile simuliert.
        </p>
      )}

      {/* Target gain not fully achievable */}
      {isValid && inputMode === 'gain' && result.soldLots.length > 0 && result.totalGain < parsedValue - CURRENCY_EPSILON && (
        <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
          ⚠ Zielgewinn nicht vollständig erreichbar. Maximaler Gewinn mit allen verfügbaren
          Anteilen: <strong>{formatCurrency(result.totalGain, CURRENCY, LOCALE)}</strong>
        </p>
      )}

      {/* Results */}
      {result.soldLots.length > 0 && (
        <>
          <SummaryCards result={result} salePrice={holding.currentPrice} />
          <FifoTable result={result} />
          <TaxHint totalGain={result.totalGain} />
        </>
      )}
    </div>
  );
};

// ─── Portfolio simulation panel ───────────────────────────────────────────────
interface PortfolioRowState {
  value: string;
  mode: InputMode;
}

const PortfolioSimPanel: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
  const [globalTarget, setGlobalTarget] = useState<string>('');
  const [rows, setRows] = useState<Record<string, PortfolioRowState>>(() =>
    Object.fromEntries(holdings.map((h) => [h.id, { value: '', mode: 'gain' as InputMode }])),
  );

  const updateRow = (id: string, patch: Partial<PortfolioRowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  /** Distribute a given target gain across holdings proportionally to each
   *  ETF's current unrealised gain (only positive gains are considered). */
  const distributeValue = (target: number) => {
    if (target <= 0) return;

    const maxGains = holdings.map((h) =>
      Math.max(
        0,
        h.lots.reduce((s, l) => s + l.shares * (h.currentPrice - l.buyPrice), 0),
      ),
    );
    const totalMaxGain = maxGains.reduce((s, g) => s + g, 0);
    if (totalMaxGain === 0) return;

    const newRows: Record<string, PortfolioRowState> = {};
    holdings.forEach((h, i) => {
      const proportion = maxGains[i] / totalMaxGain;
      const etfTarget = proportion * target;
      newRows[h.id] = {
        value: etfTarget.toFixed(2).replace('.', ','),
        mode: 'gain',
      };
    });
    setRows(newRows);
  };

  const distributeTarget = () => {
    const parsed = parseFloat(globalTarget.replace(',', '.'));
    distributeValue(parsed);
  };

  const results = useMemo(() => {
    const map: Record<string, SaleSimulationResult> = {};
    holdings.forEach((h) => {
      const row = rows[h.id];
      if (!row) return;
      const parsed = parseFloat(row.value.replace(',', '.'));
      if (isNaN(parsed) || parsed <= 0) return;
      const shares =
        row.mode === 'shares'
          ? parsed
          : sharesForTargetGain(h.lots, h.currentPrice, parsed);
      if (shares > 0) {
        map[h.id] = simulateFifoSale(h.lots, h.currentPrice, shares);
      }
    });
    return map;
  }, [holdings, rows]);

  const totalGain = Object.values(results).reduce((s, r) => s + r.totalGain, 0);
  const totalProceeds = Object.values(results).reduce((s, r) => s + r.totalProceeds, 0);
  const totalShares = Object.values(results).reduce((s, r) => s + r.totalShares, 0);

  return (
    <div>
      {/* Global target + distribute */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            inputMode="decimal"
            value={globalTarget}
            placeholder="Gesamtzielgewinn, z. B. 1.000,00"
            onChange={(e) => setGlobalTarget(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-slate-500 pr-6"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500">
            €
          </span>
        </div>
        <button
          onClick={distributeTarget}
          className="px-3 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          Verteilen
        </button>
        <button
          onClick={() => {
            setGlobalTarget('1000,00');
            distributeValue(SPARERPAUSCHBETRAG);
          }}
          className="px-3 py-2 text-xs rounded-lg border border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors whitespace-nowrap"
        >
          Freibetrag
        </button>
      </div>

      {/* Per-ETF rows */}
      <div className="space-y-2">
        {holdings.map((h) => {
          const row = rows[h.id] ?? { value: '', mode: 'gain' as InputMode };
          const result = results[h.id];
          const hasResult = !!result && result.soldLots.length > 0;

          return (
            <div
              key={h.id}
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30 p-3"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {/* ETF label */}
                <div className="min-w-[100px] flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{h.ticker}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {formatCurrency(h.currentPrice, CURRENCY, LOCALE)}
                  </p>
                </div>

                {/* Mode toggle */}
                <div className="flex gap-1">
                  {(['shares', 'gain'] as InputMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => updateRow(h.id, { mode: m, value: '' })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        row.mode === m
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {m === 'shares' ? 'Anteile' : 'Gewinn €'}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.value}
                  placeholder={row.mode === 'shares' ? 'Anteile' : 'Ziel €'}
                  onChange={(e) => updateRow(h.id, { value: e.target.value })}
                  className="w-28 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-slate-500"
                />

                {/* Result pill */}
                {hasResult && (
                  <span
                    className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                      result.totalGain >= 0
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {result.totalGain >= 0 ? '+' : ''}
                    {formatCurrency(result.totalGain, CURRENCY, LOCALE)}
                    {' · '}
                    {formatShares(result.totalShares)} Anteile
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Portfolio total summary */}
      {totalShares > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Gesamtergebnis
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Anteile gesamt', value: formatShares(totalShares) },
              { label: 'Erlös gesamt', value: formatCurrency(totalProceeds, CURRENCY, LOCALE) },
              {
                label: 'Gewinn/Verlust',
                value: (totalGain >= 0 ? '+' : '') + formatCurrency(totalGain, CURRENCY, LOCALE),
                colored: true,
                positive: totalGain >= 0,
              },
            ].map(({ label, value, colored, positive }) => (
              <div key={label} className="bg-gray-50 dark:bg-slate-900/40 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{label}</p>
                <p
                  className={`text-sm font-semibold ${
                    colored
                      ? positive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          <TaxHint totalGain={totalGain} />
        </div>
      )}
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────
export const SaleSimulationModal: React.FC<SaleSimulationModalProps> = ({
  holdings,
  initialHolding,
  onClose,
}) => {
  const [simMode, setSimMode] = useState<SimMode>(initialHolding ? 'etf' : 'portfolio');
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>(
    initialHolding?.id ?? holdings[0]?.id ?? '',
  );

  const selectedHolding = holdings.find((h) => h.id === selectedHoldingId) ?? holdings[0];

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-2xl my-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">
              Verkaufssimulation (FIFO)
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">
              Simuliere Verkäufe nach deutschem FIFO-Prinzip
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

        {/* Mode tabs */}
        <div className="flex gap-1 px-5 pt-4">
          {(['etf', 'portfolio'] as SimMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setSimMode(m)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                simMode === m
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {m === 'etf' ? 'Einzelner ETF' : 'Gesamtportfolio'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {simMode === 'etf' ? (
            <>
              {/* ETF selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  ETF
                </label>
                <select
                  value={selectedHoldingId}
                  onChange={(e) => setSelectedHoldingId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {holdings.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.ticker})
                    </option>
                  ))}
                </select>
              </div>

              {selectedHolding ? (
                <EtfSimPanel key={selectedHoldingId} holding={selectedHolding} />
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Keine Positionen vorhanden.
                </p>
              )}
            </>
          ) : (
            <PortfolioSimPanel key="portfolio" holdings={holdings} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
