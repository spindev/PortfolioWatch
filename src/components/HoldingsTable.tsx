import React from 'react';
import { Holding, Language } from '../types';
import { calculateHoldingGain, calculateHoldingGainPercent, formatCurrency, formatPercent } from '../utils/calculations';
import { t, getLocale } from '../i18n';

interface HoldingsTableProps {
  holdings: Holding[];
  selectedTicker?: string | null;
  onSelect?: (ticker: string | null) => void;
  lang: Language;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, selectedTicker, onSelect, lang }) => {
  const locale = getLocale(lang);
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);

  const handleRowClick = (ticker: string) => {
    if (!onSelect) return;
    onSelect(selectedTicker === ticker ? null : ticker);
  };

  return (
    <div>
      {/* ── Mobile card layout (< sm) ── */}
      <div className="sm:hidden space-y-3">
        {holdings.map((holding) => {
          const value = holding.shares * holding.currentPrice;
          const gain = calculateHoldingGain(holding);
          const gainPct = calculateHoldingGainPercent(holding);
          const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
          const isPositive = gain >= 0;
          const isSelected = selectedTicker === holding.ticker;

          return (
            <div
              key={holding.id}
              onClick={() => handleRowClick(holding.ticker)}
              className={`rounded-lg border p-3 transition-colors ${
                onSelect ? 'cursor-pointer' : ''
              } ${
                isSelected
                  ? 'bg-blue-900/30 border-blue-700/50'
                  : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-700/30'
              }`}
            >
              {/* Row 1: ticker + P&L % */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  )}
                  <span className="font-semibold text-white text-sm">{holding.ticker}</span>
                  <span className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(gainPct)}
                  </span>
                </div>
                <span className="text-slate-400 text-xs">{allocation.toFixed(1)}%</span>
              </div>

              {/* Row 2: full name */}
              <p className="text-slate-400 text-xs truncate mb-2">{holding.name}</p>

              {/* Row 3: current / value / gain */}
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div>
                  <p className="text-slate-500 mb-0.5">{t('colCurrent', lang)}</p>
                  <p className="text-slate-300 font-medium">{formatCurrency(holding.currentPrice, holding.currency, locale)}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5">{t('colValue', lang)}</p>
                  <p className="text-white font-medium">{formatCurrency(value, holding.currency, locale)}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5">{t('colPnl', lang)}</p>
                  <p className={`font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(gain, holding.currency, locale)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {onSelect && (
          <p className="text-slate-500 text-xs mt-2 text-center">
            {t('clickRowToView', lang)}
          </p>
        )}
      </div>

      {/* ── Desktop table layout (sm+) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-3 px-2">{t('colEtf', lang)}</th>
              <th className="text-right py-3 px-2">{t('colShares', lang)}</th>
              <th className="text-right py-3 px-2">{t('colAvgBuy', lang)}</th>
              <th className="text-right py-3 px-2">{t('colCurrent', lang)}</th>
              <th className="text-right py-3 px-2">{t('colValue', lang)}</th>
              <th className="text-right py-3 px-2">{t('colPnl', lang)}</th>
              <th className="text-right py-3 px-2">{t('colPnlPct', lang)}</th>
              <th className="text-right py-3 px-2">{t('colAllocation', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const value = holding.shares * holding.currentPrice;
              const gain = calculateHoldingGain(holding);
              const gainPct = calculateHoldingGainPercent(holding);
              const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
              const isPositive = gain >= 0;
              const isSelected = selectedTicker === holding.ticker;

              return (
                <tr
                  key={holding.id}
                  onClick={() => handleRowClick(holding.ticker)}
                  className={`border-b border-slate-700/50 transition-colors ${
                    onSelect ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-blue-900/30 border-blue-700/50'
                      : 'hover:bg-slate-700/30'
                  }`}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-white">{holding.ticker}</div>
                        <div className="text-slate-400 text-xs truncate max-w-[180px]">{holding.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 text-slate-300">{holding.shares}</td>
                  <td className="text-right py-3 px-2 text-slate-300">
                    {formatCurrency(holding.avgBuyPrice, holding.currency, locale)}
                  </td>
                  <td className="text-right py-3 px-2 text-slate-300">
                    {formatCurrency(holding.currentPrice, holding.currency, locale)}
                  </td>
                  <td className="text-right py-3 px-2 font-medium text-white">
                    {formatCurrency(value, holding.currency, locale)}
                  </td>
                  <td className={`text-right py-3 px-2 font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(gain, holding.currency, locale)}
                  </td>
                  <td className={`text-right py-3 px-2 font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(gainPct)}
                  </td>
                  <td className="text-right py-3 px-2">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${allocation}%` }}
                        />
                      </div>
                      <span className="text-slate-300 text-xs w-10 text-right">
                        {allocation.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {onSelect && (
          <p className="text-slate-500 text-xs mt-3 text-center">
            {t('clickRowToView', lang)}
          </p>
        )}
      </div>
    </div>
  );
};
