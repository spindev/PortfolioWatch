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
import { formatCurrency } from '../utils/calculations';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

interface ForecastChartProps {
  data: ForecastPoint[];
  monthlySavings: number;
  forecastYears: number;
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

export const ForecastChart: React.FC<ForecastChartProps> = ({ data, monthlySavings, forecastYears }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div>
          <h2 className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg">Prognose</h2>
          <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">
            {forecastYears}-Jahres-Prognose · {formatCurrency(monthlySavings, CURRENCY, LOCALE)}/Monat Sparrate
          </p>
        </div>
        <div className="flex gap-3 text-xs text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-red-400" />
            Pessimistisch (3% p.a.)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-500" />
            Realistisch (7% p.a.)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-emerald-500" />
            Optimistisch (10% p.a.)
          </span>
        </div>
      </div>
      <div className="h-[220px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
              width={60}
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
    </div>
  );
};
