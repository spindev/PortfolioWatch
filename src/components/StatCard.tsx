import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  positive?: boolean | null;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, positive, icon }) => {
  const valueColor =
    positive === null || positive === undefined
      ? 'text-white'
      : positive
      ? 'text-emerald-400'
      : 'text-red-400';

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col gap-1">
      <div className="flex items-center justify-between text-slate-400 text-sm">
        <span>{title}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {subtitle && <div className="text-slate-400 text-xs">{subtitle}</div>}
    </div>
  );
};
