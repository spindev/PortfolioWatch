import React from 'react';
import { Settings, Theme } from '../types';

interface SettingsPageProps {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onClose }) => {
  const handleTheme = (theme: Theme) => {
    onSave({ ...settings, theme });
  };

  return (
    /* Backdrop – clicking outside the panel closes the overlay */
    <div
      className="fixed inset-0 z-40 bg-black/50"
      onClick={onClose}
    >
      {/* Panel – full width on mobile, fixed 320px anchored top-right on sm+ */}
      <div
        className="absolute top-16 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Einstellungen</h2>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">PortfolioWatch konfigurieren</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-4 flex-shrink-0"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Theme toggle – changes apply instantly, no save button needed */}
        <div className="space-y-2">
          <p className="text-gray-700 dark:text-slate-300 text-sm font-medium">Darstellung</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleTheme('light')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center justify-center gap-2 ${
                settings.theme === 'light'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 110 14A7 7 0 0112 5z" />
              </svg>
              Hell
            </button>
            <button
              onClick={() => handleTheme('dark')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center justify-center gap-2 ${
                settings.theme === 'dark'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Dunkel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
