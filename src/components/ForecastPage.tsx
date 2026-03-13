import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  buildForecastData,
  estimateAnnualReturn,
  formatCurrency,
  formatPercent,
  ForecastDataPoint,
} from '../utils/calculations';
import { PortfolioSnapshot } from '../types';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

interface ForecastPageProps {
  currentValue: number;
  currentCost: number;
  portfolioHistory: PortfolioSnapshot[];
  monthlyInvestment: number;
  forecastYears: number;
  onClose: () => void;
}

const CustomTooltip = ({
  active, payload,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: any; payload?: any[];
}) => {
  if (active && payload && payload.length) {
    const cost = payload[0]?.value as number;
    const value = payload[1]?.value as number;
    const gain = value - cost;
    const gainPct = cost > 0 ? ((gain / cost) * 100).toFixed(2) : '0.00';
    const label = (payload[0]?.payload as ForecastDataPoint)?.label ?? '';
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-sm shadow-lg">
        <p className="text-gray-600 dark:text-slate-300 mb-1 font-medium">{label}</p>
        <p className="text-blue-600 dark:text-blue-400">
          Prognosewert: {formatCurrency(value, CURRENCY, LOCALE)}
        </p>
        <p className="text-gray-500 dark:text-slate-400">
          Investiert: {formatCurrency(cost, CURRENCY, LOCALE)}
        </p>
        <p className={gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
          Gewinn: {gain >= 0 ? '+' : ''}{formatCurrency(gain, CURRENCY, LOCALE)} ({gain >= 0 ? '+' : ''}{gainPct}%)
        </p>
      </div>
    );
  }
  return null;
};

export const ForecastPage: React.FC<ForecastPageProps> = ({
  currentValue,
  currentCost,
  portfolioHistory,
  monthlyInvestment,
  forecastYears,
  onClose,
}) => {
  const annualReturn = React.useMemo(
    () => estimateAnnualReturn(portfolioHistory),
    [portfolioHistory],
  );

  const data = React.useMemo(
    () => buildForecastData(currentValue, currentCost, monthlyInvestment, forecastYears, annualReturn),
    [currentValue, currentCost, monthlyInvestment, forecastYears, annualReturn],
  );

  const finalPoint = data[data.length - 1];
  const totalInvested = finalPoint.totalCost;
  const projectedValue = finalPoint.totalValue;
  const projectedGain = projectedValue - totalInvested;
  const projectedGainPct = totalInvested > 0 ? (projectedGain / totalInvested) * 100 : 0;
  const isPositive = projectedGain >= 0;

  const isHistoricalReturn = portfolioHistory.length >= 2;

  // Y-axis tick formatter
  const yTickFormatter = (val: number) =>
    val >= 1_000_000
      ? `€${(val / 1_000_000).toFixed(1)}M`
      : `€${(val / 1_000).toFixed(0)}k`;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-start justify-center overflow-y-auto py-6 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Prognose</h2>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">
              Entwicklung bei monatlichem Sparbetrag
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

        <div className="p-5 space-y-5">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex flex-col gap-1">
              <p className="text-gray-500 dark:text-slate-400 text-xs">Prognosewert</p>
              <p className="text-gray-900 dark:text-white font-bold text-lg leading-tight">
                {formatCurrency(projectedValue, CURRENCY, LOCALE)}
              </p>
              <p className="text-gray-400 dark:text-slate-500 text-xs">in {forecastYears} Jahren</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex flex-col gap-1">
              <p className="text-gray-500 dark:text-slate-400 text-xs">Investiert</p>
              <p className="text-gray-900 dark:text-white font-bold text-lg leading-tight">
                {formatCurrency(totalInvested, CURRENCY, LOCALE)}
              </p>
              <p className="text-gray-400 dark:text-slate-500 text-xs">
                {formatCurrency(monthlyInvestment, CURRENCY, LOCALE)}/Monat
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex flex-col gap-1">
              <p className="text-gray-500 dark:text-slate-400 text-xs">Prognosegewinn</p>
              <p className={`font-bold text-lg leading-tight ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}{formatCurrency(projectedGain, CURRENCY, LOCALE)}
              </p>
              <p className="text-gray-400 dark:text-slate-500 text-xs">Gewinn vs. Kosten</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex flex-col gap-1">
              <p className="text-gray-500 dark:text-slate-400 text-xs">Rendite</p>
              <p className={`font-bold text-lg leading-tight ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatPercent(projectedGainPct)}
              </p>
              <p className="text-gray-400 dark:text-slate-500 text-xs">Gesamt, kumuliert</p>
            </div>
          </div>

          {/* Forecast chart */}
          <div className="h-[220px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="forecastCostGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: number) => (val === 0 ? 'Heute' : `J${val}`)}
                  interval={Math.max(1, Math.floor(data.length / 8))}
                />
                <YAxis
                  tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={yTickFormatter}
                  domain={['auto', 'auto']}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="totalCost"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#forecastCostGradient)"
                  name="Investiert"
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#forecastValueGradient)"
                  name="Prognosewert"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Assumptions note */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 px-4 py-3 text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
            <p className="font-medium">Annahmen</p>
            <p>
              {formatCurrency(monthlyInvestment, CURRENCY, LOCALE)}/Monat · {forecastYears} Jahre ·{' '}
              {(annualReturn * 100).toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% p.a. erwartete Rendite
              {isHistoricalReturn
                ? ' (basierend auf historischer Portfolio-Entwicklung)'
                : ' (Standardwert)'}
            </p>
            <p className="text-blue-600/70 dark:text-blue-400/60 mt-1">
              Diese Prognose ist eine vereinfachte Modellrechnung und keine Anlageberatung. Zukünftige
              Renditen können erheblich abweichen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
