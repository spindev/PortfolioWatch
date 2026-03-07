import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Holding, PurchaseLot } from '../types';
import { formatCurrency, formatPercent, calculatePriceGainPercent } from '../utils/calculations';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

type DetailTab = 'chart' | 'lots';

interface HoldingDetailProps {
  holding: Holding;
}

// ── ETF price chart tooltip ──────────────────────────────────────────────────
const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const close = payload[0]?.value as number;
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-sm shadow-lg">
        <p className="text-gray-600 dark:text-slate-300 mb-1">{label}</p>
        <p className="text-blue-600 dark:text-blue-400 font-medium">
          {formatCurrency(close, CURRENCY, LOCALE)}
        </p>
      </div>
    );
  }
  return null;
};

// ── ETF price area chart ─────────────────────────────────────────────────────
const EtfChart: React.FC<{ holding: Holding }> = ({ holding }) => {
  const data = holding.history;
  const tickInterval = Math.max(1, Math.floor(data.length / 6));

  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
        Keine historischen Daten verfügbar
      </div>
    );
  }

  return (
    <div className="h-[200px] sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id={`etfGradient-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
            tickFormatter={(val) => {
              const d = new Date(val);
              return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(-2)}`;
            }}
          />
          <YAxis
            tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => formatCurrency(val, CURRENCY, LOCALE)}
            domain={['auto', 'auto']}
            width={70}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2}
            fill={`url(#etfGradient-${holding.id})`}
            name="Kurs"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── FIFO purchase lots table ─────────────────────────────────────────────────
const LotsTable: React.FC<{ holding: Holding }> = ({ holding }) => {
  const { lots, currentPrice } = holding;

  if (lots.length === 0) {
    return (
      <div className="py-6 text-center text-gray-400 dark:text-slate-500 text-sm">
        Keine Kaufdaten verfügbar
      </div>
    );
  }

  // Already sorted oldest-first (financeService.ts guarantees sort by date asc)
  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
        FIFO-Reihenfolge — älteste Positionen werden zuerst verkauft
      </p>
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
            <th className="text-left py-2 px-2">Kaufdatum</th>
            <th className="text-right py-2 px-2">Anteile</th>
            <th className="text-right py-2 px-2">Kaufkurs</th>
            <th className="text-right py-2 px-2">Kaufwert</th>
            <th className="text-right py-2 px-2">Akt. Wert</th>
            <th className="text-right py-2 px-2">G/V</th>
            <th className="text-right py-2 px-2">G/V %</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot: PurchaseLot, idx: number) => {
            const costBasis = lot.shares * lot.buyPrice;
            const currentValue = lot.shares * currentPrice;
            const gain = currentValue - costBasis;
            const gainPct = calculatePriceGainPercent(currentPrice, lot.buyPrice);
            const isPositive = gain >= 0;

            return (
              <tr
                key={idx}
                className="border-b border-gray-100 dark:border-slate-700/50 last:border-0"
              >
                <td className="py-2.5 px-2 text-gray-700 dark:text-slate-300">
                  {new Date(lot.date).toLocaleDateString(LOCALE)}
                </td>
                <td className="text-right py-2.5 px-2 text-gray-700 dark:text-slate-300">
                  {lot.shares}
                </td>
                <td className="text-right py-2.5 px-2 text-gray-700 dark:text-slate-300">
                  {formatCurrency(lot.buyPrice, CURRENCY, LOCALE)}
                </td>
                <td className="text-right py-2.5 px-2 text-gray-700 dark:text-slate-300">
                  {formatCurrency(costBasis, CURRENCY, LOCALE)}
                </td>
                <td className="text-right py-2.5 px-2 font-medium text-gray-900 dark:text-white">
                  {formatCurrency(currentValue, CURRENCY, LOCALE)}
                </td>
                <td className={`text-right py-2.5 px-2 font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(gain, CURRENCY, LOCALE)}
                </td>
                <td className={`text-right py-2.5 px-2 font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercent(gainPct)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 dark:border-slate-600 font-semibold">
            <td className="py-2.5 px-2 text-gray-700 dark:text-slate-300">Gesamt</td>
            <td className="text-right py-2.5 px-2 text-gray-700 dark:text-slate-300">
              {lots.reduce((s, l) => s + l.shares, 0)}
            </td>
            <td className="text-right py-2.5 px-2 text-gray-500 dark:text-slate-400 text-xs font-normal">
              Ø {formatCurrency(
                lots.reduce((s, l) => s + l.shares * l.buyPrice, 0) /
                  lots.reduce((s, l) => s + l.shares, 0),
                CURRENCY,
                LOCALE,
              )}
            </td>
            <td className="text-right py-2.5 px-2 text-gray-700 dark:text-slate-300">
              {formatCurrency(lots.reduce((s, l) => s + l.shares * l.buyPrice, 0), CURRENCY, LOCALE)}
            </td>
            <td className="text-right py-2.5 px-2 text-gray-900 dark:text-white">
              {formatCurrency(lots.reduce((s, l) => s + l.shares * currentPrice, 0), CURRENCY, LOCALE)}
            </td>
            {(() => {
              const totalCost = lots.reduce((s, l) => s + l.shares * l.buyPrice, 0);
              const totalCurrentValue = lots.reduce((s, l) => s + l.shares * currentPrice, 0);
              const totalGain = totalCurrentValue - totalCost;
              const totalShares = lots.reduce((s, l) => s + l.shares, 0);
              const weightedAvgBuy = totalShares > 0 ? totalCost / totalShares : 0;
              const totalGainPct = calculatePriceGainPercent(currentPrice, weightedAvgBuy);
              const isPos = totalGain >= 0;
              return (
                <>
                  <td className={`text-right py-2.5 px-2 ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isPos ? '+' : ''}{formatCurrency(totalGain, CURRENCY, LOCALE)}
                  </td>
                  <td className={`text-right py-2.5 px-2 ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatPercent(totalGainPct)}
                  </td>
                </>
              );
            })()}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ── Main HoldingDetail component ─────────────────────────────────────────────
export const HoldingDetail: React.FC<HoldingDetailProps> = ({ holding }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('chart');

  return (
    <div className="mt-3 pt-4 border-t border-gray-200 dark:border-slate-600">
      {/* Tab switcher */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('chart')}
          className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
            activeTab === 'chart'
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          Entwicklung
        </button>
        <button
          onClick={() => setActiveTab('lots')}
          className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
            activeTab === 'lots'
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          Käufe
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'chart' ? (
        <EtfChart holding={holding} />
      ) : (
        <LotsTable holding={holding} />
      )}
    </div>
  );
};
