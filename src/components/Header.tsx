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
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigate('portfolio')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none"
          aria-label="Zum Portfolio"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="text-left">
            <h1 className="text-gray-900 dark:text-white font-bold text-lg leading-tight">PortfolioWatch</h1>
            <p className="text-gray-500 dark:text-slate-400 text-xs">ETF Portfolio Tracker</p>
          </div>
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 min-w-0">
          {isLoading && !hasError && (
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse flex-shrink-0" />
          )}
          {hasError ? (
            <span className="text-red-500 dark:text-red-400">Fehler beim Abrufen der Kurse</span>
          ) : lastUpdated ? (
            <>
              <span className="hidden sm:inline">Aktualisiert:</span>
              <span className="truncate">{lastUpdated.toLocaleTimeString('de-DE')}</span>
            </>
          ) : (
            <span>Wird geladen…</span>
          )}
        </div>

        <button
          onClick={() => onNavigate(page === 'settings' ? 'portfolio' : 'settings')}
          className={`p-2 rounded-lg transition-colors ${
            page === 'settings'
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
          aria-label="Einstellungen"
          title="Einstellungen"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
};
