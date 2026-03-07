import React, { useState } from 'react';
import { Holding } from '../types';
import { calculateHoldingGain, calculateHoldingGainPercent, formatCurrency, formatPercent } from '../utils/calculations';
import { HoldingDetail } from './HoldingDetail';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

const ALLOCATION_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

interface HoldingsTableProps {
  holdings: Holding[];
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div>
      {/* ── Mobile card layout (< sm) ── */}
      <div className="sm:hidden space-y-3">
        {holdings.map((holding, colorIdx) => {
          const value = holding.shares * holding.currentPrice;
          const gain = calculateHoldingGain(holding);
          const gainPct = calculateHoldingGainPercent(holding);
          const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
          const isPositive = gain >= 0;
          const isExpanded = expandedId === holding.id;
          const color = ALLOCATION_COLORS[colorIdx % ALLOCATION_COLORS.length];

          return (
            <div
              key={holding.id}
              className="rounded-lg border bg-gray-50 dark:bg-slate-900/40 border-gray-200 dark:border-slate-700/50 overflow-hidden"
            >
              {/* Clickable header */}
              <button
                onClick={() => toggle(holding.id)}
                className="w-full text-left p-3"
              >
                {/* Row 1: ticker + P&L % + allocation badge */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{holding.ticker}</span>
                    <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatPercent(gainPct)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Prominent allocation badge */}
                    <span
                      className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: color }}
                    >
                      {allocation.toFixed(1)}%
                    </span>
                    {/* Expand/collapse chevron */}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Row 2: full name */}
                <p className="text-gray-500 dark:text-slate-400 text-xs truncate mb-2">{holding.name}</p>

                {/* Row 3: shares / current / value / gain */}
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <div>
                    <p className="text-gray-400 dark:text-slate-500 mb-0.5">Anteile</p>
                    <p className="text-gray-700 dark:text-slate-300 font-medium">{holding.shares}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-slate-500 mb-0.5">Aktuell</p>
                    <p className="text-gray-700 dark:text-slate-300 font-medium">{formatCurrency(holding.currentPrice, CURRENCY, LOCALE)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-slate-500 mb-0.5">Wert</p>
                    <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(value, CURRENCY, LOCALE)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-slate-500 mb-0.5">G/V</p>
                    <p className={`font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(gain, CURRENCY, LOCALE)}
                    </p>
                  </div>
                </div>
              </button>

              {/* Inline detail panel */}
              {isExpanded && (
                <div className="px-3 pb-3">
                  <HoldingDetail holding={holding} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop table layout (sm+) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
              <th className="text-left py-3 px-2">ETF</th>
              <th className="text-right py-3 px-2">Anteile</th>
              <th className="text-right py-3 px-2">Ø Kaufkurs</th>
              <th className="text-right py-3 px-2">Aktuell</th>
              <th className="text-right py-3 px-2">Wert</th>
              <th className="text-right py-3 px-2">G/V</th>
              <th className="text-right py-3 px-2">G/V %</th>
              <th className="text-right py-3 px-2">Allokation</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, colorIdx) => {
              const value = holding.shares * holding.currentPrice;
              const gain = calculateHoldingGain(holding);
              const gainPct = calculateHoldingGainPercent(holding);
              const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
              const isPositive = gain >= 0;
              const isExpanded = expandedId === holding.id;
              const color = ALLOCATION_COLORS[colorIdx % ALLOCATION_COLORS.length];

              return (
                <React.Fragment key={holding.id}>
                  <tr
                    onClick={() => toggle(holding.id)}
                    className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer select-none"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{holding.ticker}</div>
                          <div className="text-gray-500 dark:text-slate-400 text-xs truncate max-w-[180px]">{holding.name}</div>
                        </div>
                        <svg
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 text-gray-700 dark:text-slate-300">{holding.shares}</td>
                    <td className="text-right py-3 px-2 text-gray-700 dark:text-slate-300">
                      {formatCurrency(holding.avgBuyPrice, CURRENCY, LOCALE)}
                    </td>
                    <td className="text-right py-3 px-2 text-gray-700 dark:text-slate-300">
                      {formatCurrency(holding.currentPrice, CURRENCY, LOCALE)}
                    </td>
                    <td className="text-right py-3 px-2 font-medium text-gray-900 dark:text-white">
                      {formatCurrency(value, CURRENCY, LOCALE)}
                    </td>
                    <td className={`text-right py-3 px-2 font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(gain, CURRENCY, LOCALE)}
                    </td>
                    <td className={`text-right py-3 px-2 font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatPercent(gainPct)}
                    </td>
                    <td className="text-right py-3 px-2">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${allocation}%`, backgroundColor: color }}
                          />
                        </div>
                        <span
                          className="text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[46px] text-center"
                          style={{ backgroundColor: color }}
                        >
                          {allocation.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Inline detail row */}
                  {isExpanded && (
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30">
                      <td colSpan={8} className="px-4 pb-4">
                        <HoldingDetail holding={holding} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
