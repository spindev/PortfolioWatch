import React, { useState } from 'react';
import { Settings } from '../types';

interface SettingsPageProps {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

const MIN_INTERVAL = 5;
const MAX_INTERVAL = 60;

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onClose }) => {
  const [refreshInterval, setRefreshInterval] = useState(
    Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, settings.refreshInterval))
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ ...settings, refreshInterval });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    /* Backdrop – clicking outside the panel closes the overlay */
    <div
      className="fixed inset-0 z-40 bg-black/50"
      onClick={onClose}
    >
      {/* Panel – positioned in the top-right corner, below the header */}
      <div
        className="absolute top-16 right-4 bg-slate-800 rounded-xl p-6 border border-slate-700 w-80 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Settings</h2>
            <p className="text-slate-400 text-xs mt-0.5">Configure how PortfolioWatch behaves</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors ml-4 flex-shrink-0"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-slate-300 text-sm font-medium">
            Auto-refresh interval
          </label>
          <p className="text-slate-400 text-xs">
            How often live prices are fetched from Yahoo Finance (5 – 60 seconds).
          </p>

          {/* Slider + selected value */}
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={MIN_INTERVAL}
              max={MAX_INTERVAL}
              step={5}
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-white text-sm font-medium w-10 text-right">
              {refreshInterval}s
            </span>
          </div>
          <div className="flex justify-between text-slate-500 text-xs">
            <span>5s</span>
            <span>20s</span>
            <span>40s</span>
            <span>60s</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Save Settings
          </button>
          {saved && (
            <span className="text-emerald-400 text-sm">✓ Saved</span>
          )}
        </div>

        <div className="border-t border-slate-700 pt-4 space-y-2">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Demo Portfolio</p>
          <p className="text-slate-400 text-xs">
            World (URTH) · EM (EEM) · ESG Europe (LCEU.SW) — 100 shares each
          </p>
          <p className="text-slate-400 text-xs">
            Prices fetched from Yahoo Finance · Buy price = price 1 year ago
          </p>
        </div>
      </div>
    </div>
  );
};
