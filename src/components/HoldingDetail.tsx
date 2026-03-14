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
import { Holding, PurchaseLot, DetailTab } from '../types';
import { formatCurrency, formatPercent, calculatePriceGainPercent, formatShares, isFractional } from '../utils/calculations';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

interface HoldingDetailProps {
  holding: Holding;
  /** Controlled active tab – when provided the parent owns the tab state */
  activeTab?: DetailTab;
  onTabChange?: (tab: DetailTab) => void;
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
    const formattedDate = label
      ? new Date(label).toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' })
      : label;
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-sm shadow-lg">
        <p className="text-gray-600 dark:text-slate-300 mb-1">{formattedDate}</p>
        <p className="text-blue-600 dark:text-blue-400 font-medium">
          {formatCurrency(close, CURRENCY, LOCALE)}
        </p>
      </div>
    );
  }
  return null;
};

// ── ETF price area chart ─────────────────────────────────────────────────────
type EtfTimeRange = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'MAX';
const ETF_TIME_RANGES: EtfTimeRange[] = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'];

const EtfChart: React.FC<{ holding: Holding; compact?: boolean }> = ({ holding, compact = false }) => {
  const [timeRange, setTimeRange] = useState<EtfTimeRange>('1Y');

  // First purchase date for this holding – used to anchor the MAX range
  const firstLotDate = holding.lots.length > 0 ? holding.lots[0].date : null;

  const data = React.useMemo(() => {
    if (timeRange === 'MAX') {
      return firstLotDate
        ? holding.history.filter((d) => d.date >= firstLotDate)
        : holding.history;
    }
    const days =
      timeRange === '1M' ? 30 :
      timeRange === '3M' ? 90 :
      timeRange === '6M' ? 180 :
      timeRange === '1Y' ? 365 :
      timeRange === '3Y' ? 1095 :
      1825; // 5Y
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return holding.history.filter((d) => new Date(d.date) >= cutoff);
  }, [holding.history, timeRange, firstLotDate]);

  // Percentage change from the start to the end of the visible data window
  const periodReturn = React.useMemo(() => {
    if (data.length < 2) return null;
    const startPrice = data[0].close;
    const endPrice = data[data.length - 1].close;
    if (startPrice === 0) return null;
    return ((endPrice - startPrice) / startPrice) * 100;
  }, [data]);

  // Use a year-aware format for ranges longer than 6 months
  const useLongFormat = timeRange === '1Y' || timeRange === '3Y' || timeRange === '5Y' || timeRange === 'MAX';

  // Show ~6 ticks regardless of data density
  const tickInterval = Math.max(1, Math.floor(data.length / 6));

  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
        Keine historischen Daten verfügbar
      </div>
    );
  }

  return (
    <div>
      {/* Time range selector + period return */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {ETF_TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                timeRange === r
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {periodReturn !== null && (
          <span className={`text-sm font-semibold ${periodReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatPercent(periodReturn)}
          </span>
        )}
      </div>
      <div className={compact ? 'h-[180px]' : 'h-[200px] sm:h-[240px]'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`etfGradient-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--chart-tick)', fontSize: compact ? 10 : 11 }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              tickFormatter={(val) => {
                if (useLongFormat) {
                  return new Date(val as string).toLocaleDateString(LOCALE, { month: 'short', year: '2-digit' });
                }
                const d = new Date(val as string);
                return d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit' });
              }}
            />
            <YAxis
              tick={{ fill: 'var(--chart-tick)', fontSize: compact ? 10 : 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatCurrency(val, CURRENCY, LOCALE)}
              domain={['auto', 'auto']}
              width={compact ? 58 : 70}
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
                  {formatShares(lot.shares)}
                  {lot.isPartialLot && isFractional(lot.shares) && (
                    <span title="Bruchstück" className="ml-1 text-amber-500">◆</span>
                  )}
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
      </table>
    </div>
  );
};

// ── Mobile card list for purchase lots ──────────────────────────────────────
const LotsCards: React.FC<{ holding: Holding }> = ({ holding }) => {
  const { lots, currentPrice } = holding;

  if (lots.length === 0) {
    return (
      <div className="py-4 text-center text-gray-400 dark:text-slate-500 text-sm">
        Keine Kaufdaten verfügbar
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
        FIFO-Reihenfolge — älteste Positionen werden zuerst verkauft
      </p>
      {lots.map((lot: PurchaseLot, idx: number) => {
        const costBasis = lot.shares * lot.buyPrice;
        const currentValue = lot.shares * currentPrice;
        const gain = currentValue - costBasis;
        const gainPct = calculatePriceGainPercent(currentPrice, lot.buyPrice);
        const isPositive = gain >= 0;

        return (
          <div
            key={idx}
            className="rounded-md bg-gray-100 dark:bg-slate-800/60 p-3"
          >
            {/* Header: date + P/L */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {new Date(lot.date).toLocaleDateString(LOCALE)}
              </span>
              <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}{formatCurrency(gain, CURRENCY, LOCALE)}&nbsp;({formatPercent(gainPct)})
              </span>
            </div>
            {/* Details grid */}
            <div className="grid grid-cols-4 gap-1 text-xs">
              <div>
                <p className="text-gray-400 dark:text-slate-500 mb-0.5">Anteile</p>
                <p className="text-gray-700 dark:text-slate-300 font-medium">
                  {formatShares(lot.shares)}
                  {lot.isPartialLot && isFractional(lot.shares) && (
                    <span title="Bruchstück" className="ml-1 text-amber-500">◆</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-slate-500 mb-0.5">Kaufkurs</p>
                <p className="text-gray-700 dark:text-slate-300 font-medium">{formatCurrency(lot.buyPrice, CURRENCY, LOCALE)}</p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-slate-500 mb-0.5">Kaufwert</p>
                <p className="text-gray-700 dark:text-slate-300 font-medium">{formatCurrency(costBasis, CURRENCY, LOCALE)}</p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-slate-500 mb-0.5">Akt. Wert</p>
                <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(currentValue, CURRENCY, LOCALE)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


export const HoldingDetail: React.FC<HoldingDetailProps> = ({ holding, activeTab: controlledTab, onTabChange }) => {
  const [localTab, setLocalTab] = useState<DetailTab>('chart');
  const activeTab = controlledTab ?? localTab;
  const setActiveTab = (tab: DetailTab) => {
    if (onTabChange) onTabChange(tab);
    else setLocalTab(tab);
  };

  const tabButton = (tab: DetailTab, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
        activeTab === tab
          ? 'bg-blue-600 text-white'
          : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-3 pt-4 border-t border-gray-200 dark:border-slate-600">

      {/* ── Mobile layout: tabs with mobile-optimised content ── */}
      <div className="sm:hidden">
        <div className="flex gap-1 mb-4">
          {tabButton('chart', 'Entwicklung')}
          {tabButton('lots', 'Käufe')}
        </div>
        {activeTab === 'chart' ? (
          <EtfChart holding={holding} compact />
        ) : (
          <LotsCards holding={holding} />
        )}
      </div>

      {/* ── Desktop layout: tabs with full table ── */}
      <div className="hidden sm:block">
        <div className="flex gap-1 mb-4">
          {tabButton('chart', 'Entwicklung')}
          {tabButton('lots', 'Käufe')}
        </div>
        {activeTab === 'chart' ? (
          <EtfChart holding={holding} />
        ) : (
          <LotsTable holding={holding} />
        )}
      </div>
    </div>
  );
};
