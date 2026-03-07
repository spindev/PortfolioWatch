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
import { Holding, Language } from '../types';
import { getLocale, getCurrencySymbol } from '../i18n';
import { formatCurrency } from '../utils/calculations';

interface SectorChartProps {
  holdings: Holding[];
  lang: Language;
  currency: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const CustomTooltip = ({
  active, payload, currency, locale,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: any; payload?: any[];
  currency: string; locale: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm">
        <p className="text-white font-medium">{payload[0].payload.sector}</p>
        <p className="text-blue-400">{formatCurrency(payload[0].value, currency, locale)}</p>
      </div>
    );
  }
  return null;
};

export const SectorChart: React.FC<SectorChartProps> = ({ holdings, lang, currency }) => {
  const locale = getLocale(lang);
  const symbol = getCurrencySymbol(currency);

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
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sectorData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `${symbol}${(val / 1000).toFixed(1)}k`}
        />
        <YAxis
          dataKey="sector"
          type="category"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {sectorData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
