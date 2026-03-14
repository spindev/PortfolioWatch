import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { type ValueType, type NameType } from 'recharts/types/component/DefaultTooltipContent';
import { ForecastPoint } from '../types';
import { formatCurrency, formatPercent } from '../utils/calculations';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

interface ForecastChartProps {
  data: ForecastPoint[];
  monthlySavings: number;
  forecastYears: number;
  totalCost: number;
}

const CustomTooltip = ({
  active, payload, label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-sm shadow-lg">
        <p className="text-gray-600 dark:text-slate-300 font-medium mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value as number, CURRENCY, LOCALE)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ForecastChart: React.FC<ForecastChartProps> = ({ data, monthlySavings, forecastYears, totalCost }) => {
  const last = data[data.length - 1];

  const scenarios = [
    { key: 'pessimistic', label: 'Pessimistisch', rate: '3%', color: '#f87171', value: last?.pessimistic ?? 0 },
    { key: 'realistic',   label: 'Realistisch',   rate: '7%', color: '#3b82f6', value: last?.realistic ?? 0 },
    { key: 'optimistic',  label: 'Optimistisch',  rate: '10%', color: '#10b981', value: last?.optimistic ?? 0 },
  ];
  const finalInvested = last?.totalInvested ?? totalCost;

  return (
    <div>
      <p className="text-gray-500 dark:text-slate-400 text-xs mb-3">
        {forecastYears}-Jahres-Prognose · {formatCurrency(monthlySavings, CURRENCY, LOCALE)}/Monat Sparrate
      </p>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Chart */}
        <div className="flex-1 min-w-0 h-[220px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(1)}M`;
                  return `€${(val / 1000).toFixed(0)}k`;
                }}
                domain={['auto', 'auto']}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) => (
                  <span style={{ color: 'var(--chart-tick)' }}>{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="totalInvested"
                name="Eingesetzt"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="pessimistic"
                name="Pessimistisch"
                stroke="#f87171"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="realistic"
                name="Realistisch"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="optimistic"
                name="Optimistisch"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gesamtentwicklung — rechts neben dem Chart */}
        <div className="lg:w-52 flex flex-col gap-2 justify-center">
          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            <span className="font-medium text-gray-700 dark:text-slate-300">Gesamtentwicklung</span>
            <span className="block mt-0.5">Kosten: {formatCurrency(finalInvested, CURRENCY, LOCALE)}</span>
          </div>
          {scenarios.map((s) => {
            const gain = s.value - finalInvested;
            const gainPct = finalInvested > 0 ? (gain / finalInvested) * 100 : 0;
            const positive = gain >= 0;
            return (
              <div
                key={s.key}
                className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-900/50"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                    {s.label} ({s.rate} p.a.)
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(s.value, CURRENCY, LOCALE)}
                </p>
                <p className={`text-xs font-medium mt-0.5 ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {positive ? '+' : ''}{formatCurrency(gain, CURRENCY, LOCALE)}{' '}
                  ({formatPercent(gainPct)})
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
