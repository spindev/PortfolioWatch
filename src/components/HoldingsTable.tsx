import React from 'react';
import { Holding } from '../types';
import { calculateHoldingGain, calculateHoldingGainPercent, formatCurrency, formatPercent } from '../utils/calculations';

interface HoldingsTableProps {
  holdings: Holding[];
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings }) => {
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700">
            <th className="text-left py-3 px-2">ETF</th>
            <th className="text-right py-3 px-2">Shares</th>
            <th className="text-right py-3 px-2">Avg. Buy</th>
            <th className="text-right py-3 px-2">Current</th>
            <th className="text-right py-3 px-2">Value</th>
            <th className="text-right py-3 px-2">P&amp;L</th>
            <th className="text-right py-3 px-2">P&amp;L %</th>
            <th className="text-right py-3 px-2">Allocation</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const value = holding.shares * holding.currentPrice;
            const gain = calculateHoldingGain(holding);
            const gainPct = calculateHoldingGainPercent(holding);
            const allocation = (value / totalValue) * 100;
            const isPositive = gain >= 0;

            return (
              <tr
                key={holding.id}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
              >
                <td className="py-3 px-2">
                  <div className="font-semibold text-white">{holding.ticker}</div>
                  <div className="text-slate-400 text-xs truncate max-w-[180px]">{holding.name}</div>
                </td>
                <td className="text-right py-3 px-2 text-slate-300">{holding.shares}</td>
                <td className="text-right py-3 px-2 text-slate-300">
                  {formatCurrency(holding.avgBuyPrice, holding.currency)}
                </td>
                <td className="text-right py-3 px-2 text-slate-300">
                  {formatCurrency(holding.currentPrice, holding.currency)}
                </td>
                <td className="text-right py-3 px-2 font-medium text-white">
                  {formatCurrency(value, holding.currency)}
                </td>
                <td className={`text-right py-3 px-2 font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(gain, holding.currency)}
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
    </div>
  );
};
