import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">PortfolioWatch</h1>
            <p className="text-slate-400 text-xs">ETF Portfolio Tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs hidden sm:block">
            Last updated: {new Date().toLocaleDateString('de-DE')}
          </span>
          <button
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded-lg transition-colors"
            title="CSV Import coming soon"
            disabled
          >
            + Import CSV
          </button>
        </div>
      </div>
    </header>
  );
};
