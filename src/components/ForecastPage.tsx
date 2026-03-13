import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  buildForecastData,
  estimateAnnualReturn,
  formatCurrency,
  formatPercent,
} from '../utils/calculations';
import { PortfolioSnapshot } from '../types';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

/** Rates for the three scenarios */
const RATE_PESSIMISTIC = 0.03;
const RATE_OPTIMISTIC = 0.10;

/** Format an annual rate (0.07 → "7,0%") */
const fmtRate = (rate: number) =>
  `${(rate * 100).toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

interface ScenarioPoint {
  year: number;
  label: string;
  totalCost: number;
  pessimistic: number;
  realistic: number;
  optimistic: number;
}

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
    const point = payload[0]?.payload as ScenarioPoint;
    if (!point) return null;
    const cost = point.totalCost;
    const pessimistic = point.pessimistic;
    const realistic = point.realistic;
    const optimistic = point.optimistic;
    const gainPct = (val: number) =>
      cost > 0 ? formatPercent(((val - cost) / cost) * 100) : '–';
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-xs shadow-lg space-y-1 min-w-[200px]">
        <p className="text-gray-600 dark:text-slate-300 font-medium mb-1">{point.label}</p>
        <p className="text-gray-500 dark:text-slate-400">
          Investiert: {formatCurrency(cost, CURRENCY, LOCALE)}
        </p>
        <p className="text-amber-600 dark:text-amber-400">
          Pessimistisch ({fmtRate(RATE_PESSIMISTIC)}): {formatCurrency(pessimistic, CURRENCY, LOCALE)}{' '}
          <span className="opacity-70">({gainPct(pessimistic)})</span>
        </p>
        <p className="text-blue-600 dark:text-blue-400">
          Realistisch: {formatCurrency(realistic, CURRENCY, LOCALE)}{' '}
          <span className="opacity-70">({gainPct(realistic)})</span>
        </p>
        <p className="text-emerald-600 dark:text-emerald-400">
          Optimistisch ({fmtRate(RATE_OPTIMISTIC)}): {formatCurrency(optimistic, CURRENCY, LOCALE)}{' '}
          <span className="opacity-70">({gainPct(optimistic)})</span>
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
  const realisticRate = React.useMemo(
    () => estimateAnnualReturn(portfolioHistory),
    [portfolioHistory],
  );

  const isHistoricalReturn = portfolioHistory.length >= 2;

  /** Build the combined chart dataset from the three scenarios */
  const chartData = React.useMemo<ScenarioPoint[]>(() => {
    const pess = buildForecastData(currentValue, currentCost, monthlyInvestment, forecastYears, RATE_PESSIMISTIC);
    const real = buildForecastData(currentValue, currentCost, monthlyInvestment, forecastYears, realisticRate);
    const opti = buildForecastData(currentValue, currentCost, monthlyInvestment, forecastYears, RATE_OPTIMISTIC);
    return pess.map((p, i) => ({
      year: p.year,
      label: p.label,
      totalCost: p.totalCost,
      pessimistic: p.totalValue,
      realistic: real[i].totalValue,
      optimistic: opti[i].totalValue,
    }));
  }, [currentValue, currentCost, monthlyInvestment, forecastYears, realisticRate]);

  const finalPoint = chartData[chartData.length - 1];
  const totalInvested = finalPoint.totalCost;

  // Per-scenario stats
  const scenarios = [
    {
      key: 'pessimistic',
      label: 'Pessimistisch',
      rate: RATE_PESSIMISTIC,
      value: finalPoint.pessimistic,
      color: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-200 dark:border-amber-700/50',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      key: 'realistic',
      label: 'Realistisch',
      rate: realisticRate,
      value: finalPoint.realistic,
      color: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-700/50',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      key: 'optimistic',
      label: 'Optimistisch',
      rate: RATE_OPTIMISTIC,
      value: finalPoint.optimistic,
      color: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-200 dark:border-emerald-700/50',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
  ];

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
              Entwicklung bei monatlichem Sparbetrag · {formatCurrency(monthlyInvestment, CURRENCY, LOCALE)}/Monat · {forecastYears} Jahre
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
          {/* Scenario stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {scenarios.map((s) => {
              const gain = s.value - totalInvested;
              const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
              const pos = gain >= 0;
              return (
                <div
                  key={s.key}
                  className={`${s.bgColor} rounded-xl p-3 sm:p-4 border ${s.borderColor} flex flex-col gap-1`}
                >
                  <p className={`${s.color} text-xs font-semibold`}>{s.label}</p>
                  <p className="text-gray-900 dark:text-white font-bold text-base sm:text-lg leading-tight">
                    {formatCurrency(s.value, CURRENCY, LOCALE)}
                  </p>
                  <p className={`text-xs font-medium ${pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatPercent(gainPct)}
                  </p>
                  <p className="text-gray-400 dark:text-slate-500 text-xs">
                    {fmtRate(s.rate)} p.a.
                    {s.key === 'realistic' && isHistoricalReturn ? ' ⌀' : ''}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Invested capital sub-note */}
          <p className="text-gray-500 dark:text-slate-400 text-xs -mt-2">
            Gesamtinvestition: <span className="font-medium text-gray-700 dark:text-slate-300">{formatCurrency(totalInvested, CURRENCY, LOCALE)}</span>
            {' '}({formatCurrency(monthlyInvestment, CURRENCY, LOCALE)}/Monat)
          </p>

          {/* Forecast chart */}
          <div className="h-[220px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="fcOptGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fcRealGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fcPessGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fcCostGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
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
                  interval={Math.max(1, Math.floor(chartData.length / 8))}
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
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: 'var(--chart-tick)' }}>{value}</span>
                  )}
                />
                {/* Cost basis */}
                <Area
                  type="monotone"
                  dataKey="totalCost"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#fcCostGradient)"
                  name="Investiert"
                  legendType="plainline"
                />
                {/* Pessimistic */}
                <Area
                  type="monotone"
                  dataKey="pessimistic"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  fill="url(#fcPessGradient)"
                  name="Pessimistisch"
                  legendType="plainline"
                />
                {/* Realistic */}
                <Area
                  type="monotone"
                  dataKey="realistic"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#fcRealGradient)"
                  name="Realistisch"
                  legendType="plainline"
                />
                {/* Optimistic */}
                <Area
                  type="monotone"
                  dataKey="optimistic"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#fcOptGradient)"
                  name="Optimistisch"
                  legendType="plainline"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Assumptions note */}
          <div className="rounded-lg bg-gray-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-700 px-4 py-3 text-xs text-gray-600 dark:text-slate-400 space-y-1">
            <p className="font-medium text-gray-700 dark:text-slate-300">Annahmen</p>
            <ul className="space-y-0.5">
              <li className="text-amber-600 dark:text-amber-400">
                Pessimistisch: {fmtRate(RATE_PESSIMISTIC)} p.a.
              </li>
              <li className="text-blue-600 dark:text-blue-400">
                Realistisch: {fmtRate(realisticRate)} p.a.
                {isHistoricalReturn
                  ? ' (Ø historische Portfolio-Rendite)'
                  : ' (Standardwert)'}
              </li>
              <li className="text-emerald-600 dark:text-emerald-400">
                Optimistisch: {fmtRate(RATE_OPTIMISTIC)} p.a.
              </li>
            </ul>
            <p className="text-gray-400 dark:text-slate-500 mt-1">
              Diese Prognose ist eine vereinfachte Modellrechnung und keine Anlageberatung.
              Zukünftige Renditen können erheblich abweichen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
