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
import { PortfolioSnapshot } from '../types';
import { formatCurrency } from '../utils/calculations';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

interface PortfolioChartProps {
  data: PortfolioSnapshot[];
  timeRange: '1M' | '3M' | '6M' | '1Y' | 'ALL';
}

const CustomTooltip = ({
  active, payload, label,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: any; payload?: any[]; label?: string;
}) => {
  if (active && payload && payload.length) {
    const cost = payload[0]?.value;
    const value = payload[1]?.value;
    const gain = value - cost;
    const gainPct = cost > 0 ? ((gain / cost) * 100).toFixed(2) : '0.00';
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-sm shadow-lg">
        <p className="text-gray-600 dark:text-slate-300 mb-1">{label}</p>
        <p className="text-blue-600 dark:text-blue-400">Wert: {formatCurrency(value, CURRENCY, LOCALE)}</p>
        <p className="text-gray-500 dark:text-slate-400">Kosten: {formatCurrency(cost, CURRENCY, LOCALE)}</p>
        <p className={gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
          G/V: {gain >= 0 ? '+' : ''}{formatCurrency(gain, CURRENCY, LOCALE)} ({gain >= 0 ? '+' : ''}{gainPct}%)
        </p>
      </div>
    );
  }
  return null;
};

export const PortfolioChart: React.FC<PortfolioChartProps> = ({ data, timeRange }) => {
  const filtered = React.useMemo(() => {
    const days =
      timeRange === '1M' ? 30 :
      timeRange === '3M' ? 90 :
      timeRange === '6M' ? 180 :
      timeRange === '1Y' ? 365 :
      data.length;
    return data.slice(-days);
  }, [data, timeRange]);

  const tickInterval = Math.max(1, Math.floor(filtered.length / 6));

  // Use a year-aware format for ranges longer than 6 months
  const useLongFormat = timeRange === '1Y' || timeRange === 'ALL';

  return (
    <div className="h-[220px] sm:h-[320px]">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={filtered} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
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
              if (useLongFormat) {
                return new Date(val as string).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
              }
              const [_year, month, day] = (val as string).split('-');
              return `${parseInt(day, 10)}.${parseInt(month, 10)}.`;
            }}
        />
        <YAxis
          tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `€${(val / 1000).toFixed(1)}k`}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="totalCost"
          stroke="#64748b"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="url(#costGradient)"
          name="Kostenbasis"
        />
        <Area
          type="monotone"
          dataKey="totalValue"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#valueGradient)"
          name="Portfoliowert"
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
};
