import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Holding } from '../types';
import { formatCurrency } from '../utils/calculations';

const CURRENCY = 'EUR';
const LOCALE = 'de-DE';

interface SectorChartProps {
  holdings: Holding[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const CustomTooltip = ({
  active, payload,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: any; payload?: any[];
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-sm shadow-lg">
        <p className="text-gray-900 dark:text-white font-medium">{payload[0].payload.sector}</p>
        <p className="text-blue-600 dark:text-blue-400">{formatCurrency(payload[0].value, CURRENCY, LOCALE)}</p>
      </div>
    );
  }
  return null;
};

export const SectorChart: React.FC<SectorChartProps> = ({ holdings }) => {
  const sectorData = React.useMemo(() => {
    const map: Record<string, number> = {};
    holdings.forEach((h) => {
      map[h.sector] = (map[h.sector] || 0) + h.shares * h.currentPrice;
    });
    return Object.entries(map)
      .map(([sector, value]) => ({ sector, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  return (
    <div className="h-[220px] sm:h-[260px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sectorData} layout="vertical" margin={{ top: 5, right: 20, left: 4, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `€${(val / 1000).toFixed(1)}k`}
        />
        <YAxis
          dataKey="sector"
          type="category"
          tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {sectorData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
};
