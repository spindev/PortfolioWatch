import React from 'react';

interface HeaderProps {
  page: 'portfolio' | 'settings';
  onNavigate: (page: 'portfolio' | 'settings') => void;
  lastUpdated: Date | null;
  isLoading: boolean;
  hasError: boolean;
}

export const Header: React.FC<HeaderProps> = ({ page, onNavigate, lastUpdated, isLoading, hasError }) => {
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

        <nav className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('portfolio')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              page === 'portfolio'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              page === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            ⚙ Settings
          </button>
        </nav>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          {isLoading && !hasError && (
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          )}
          {hasError ? (
            <span className="text-red-400">Price fetch error</span>
          ) : lastUpdated ? (
            <span>Updated: {lastUpdated.toLocaleTimeString('de-DE')}</span>
          ) : (
            <span>Loading…</span>
          )}
        </div>
      </div>
    </header>
  );
};
