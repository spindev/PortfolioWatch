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
import { Language } from '../types';
import { t, getLocale, getCurrencySymbol } from '../i18n';
import { formatCurrency } from '../utils/calculations';

interface PortfolioChartProps {
  data: PortfolioSnapshot[];
  timeRange: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  lang: Language;
  currency: string;
}

const CustomTooltip = ({
  active, payload, label, lang, currency, locale,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: any; payload?: any[]; label?: string;
  lang: Language; currency: string; locale: string;
}) => {
  if (active && payload && payload.length) {
    const value = payload[0]?.value;
    const cost = payload[1]?.value;
    const gain = value - cost;
    const gainPct = ((gain / cost) * 100).toFixed(2);
    return (
      <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm">
        <p className="text-slate-300 mb-1">{label}</p>
        <p className="text-blue-400">{t('tooltipValue', lang)}: {formatCurrency(value, currency, locale)}</p>
        <p className="text-slate-400">{t('tooltipCost', lang)}: {formatCurrency(cost, currency, locale)}</p>
        <p className={gain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {t('tooltipPnl', lang)}: {gain >= 0 ? '+' : ''}{formatCurrency(gain, currency, locale)} ({gain >= 0 ? '+' : ''}{gainPct}%)
        </p>
      </div>
    );
  }
  return null;
};

export const PortfolioChart: React.FC<PortfolioChartProps> = ({ data, timeRange, lang, currency }) => {
  const locale = getLocale(lang);
  const symbol = getCurrencySymbol(currency);

  const filtered = React.useMemo(() => {
    const days = timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : timeRange === '6M' ? 180 : timeRange === '1Y' ? 365 : data.length;
    return data.slice(-days);
  }, [data, timeRange]);

  const tickInterval = Math.max(1, Math.floor(filtered.length / 6));

  return (
    <ResponsiveContainer width="100%" height={320}>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={tickInterval}
          tickFormatter={(val) => {
            const d = new Date(val);
            return `${d.getDate()}.${d.getMonth() + 1}.`;
          }}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `${symbol}${(val / 1000).toFixed(1)}k`}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip lang={lang} currency={currency} locale={locale} />} />
        <Area
          type="monotone"
          dataKey="totalCost"
          stroke="#64748b"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="url(#costGradient)"
          name={t('costBasis', lang)}
        />
        <Area
          type="monotone"
          dataKey="totalValue"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#valueGradient)"
          name={t('portfolioValueLabel', lang)}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
