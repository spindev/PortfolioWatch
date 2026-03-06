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
      <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm">
        <p className="text-white font-medium">{payload[0].name}</p>
        <p className="text-blue-400">{payload[0].value.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export const AllocationChart: React.FC<AllocationChartProps> = ({ holdings }) => {
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);

  const data = holdings.map((h) => ({
    name: h.ticker,
    value: Math.round(((h.shares * h.currentPrice) / totalValue) * 1000) / 10,
    fullName: h.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
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
  );
};
