import React, { useState } from 'react';
import { Settings } from '../types';

interface SettingsPageProps {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

const PRESETS = [10, 30, 60, 120, 300];

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onClose }) => {
  const [refreshInterval, setRefreshInterval] = useState(settings.refreshInterval);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ ...settings, refreshInterval });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 5) setRefreshInterval(v);
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
            How often live prices are fetched from Yahoo Finance. Minimum 5 seconds.
          </p>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setRefreshInterval(preset)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  refreshInterval === preset
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {preset < 60 ? `${preset}s` : `${preset / 60}m`}
              </button>
            ))}
          </div>

          {/* Manual input */}
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={5}
              value={refreshInterval}
              onChange={handleInput}
              className="w-28 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-sm">seconds</span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={5}
            max={300}
            step={5}
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-slate-500 text-xs">
            <span>5s</span>
            <span>1m</span>
            <span>2m</span>
            <span>5m</span>
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
            ESG (ESGU) · World (URTH) · EM (EEM) — 100 shares each
          </p>
          <p className="text-slate-400 text-xs">
            Prices fetched from Yahoo Finance · Buy price = price 1 year ago
          </p>
        </div>
      </div>
    </div>
  );
};
