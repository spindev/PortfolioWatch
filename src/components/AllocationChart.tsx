import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Holding } from '../types';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

interface AllocationChartProps {
  holdings: Holding[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-sm shadow-lg">
        <p className="text-gray-900 dark:text-white font-medium">{payload[0].payload.fullName}</p>
        <p className="text-blue-600 dark:text-blue-400 font-semibold">{payload[0].value.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

export const AllocationChart: React.FC<AllocationChartProps> = ({ holdings }) => {
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);

  const data = holdings.map((h) => ({
    name: h.ticker,
    value: Math.round(((h.shares * h.currentPrice) / totalValue) * 1000) / 10,
    fullName: h.name,
  }));

  return (
    <div className="h-[220px] sm:h-[280px]">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
          label={<CustomLabel />}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
    </div>
  );
};
