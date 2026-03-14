import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  positive?: boolean | null;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, positive, icon }) => {
  const valueColor =
    positive === null || positive === undefined
      ? 'text-gray-900 dark:text-white'
      : positive
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-slate-700 flex flex-col gap-1">
      <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 text-xs">
        <span>{title}</span>
        {icon && <span className="text-gray-400 dark:text-slate-500">{icon}</span>}
      </div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
    </div>
  );
};
