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
    <div className="max-w-lg mx-auto">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div>
          <h2 className="text-white font-semibold text-lg">Settings</h2>
          <p className="text-slate-400 text-xs mt-0.5">Configure how PortfolioWatch behaves</p>
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
