import React, { useState } from 'react';
import { Settings, Language, Currency } from '../types';
import { t } from '../i18n';

interface SettingsPageProps {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onClose }) => {
  const [language, setLanguage] = useState<Language>(settings.language);
  const [currency, setCurrency] = useState<Currency>(settings.currency);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ language, currency });
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
            <h2 className="text-white font-semibold text-lg">{t('settingsTitle', language)}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{t('settingsSubtitle', language)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors ml-4 flex-shrink-0"
            aria-label={t('settings', language)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <p className="text-slate-300 text-sm font-medium">{t('languageLabel', language)}</p>
          <div className="flex gap-2">
            {(['de', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  language === l
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {l === 'de' ? t('langDe', language) : t('langEn', language)}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <p className="text-slate-300 text-sm font-medium">{t('currencyLabel', language)}</p>
          <div className="flex gap-2">
            {(['EUR', 'USD'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  currency === c
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {c === 'EUR' ? t('currEur', language) : t('currUsd', language)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {t('save', language)}
          </button>
          {saved && (
            <span className="text-emerald-400 text-sm">{t('savedConfirm', language)}</span>
          )}
        </div>

        <div className="border-t border-slate-700 pt-4 space-y-2">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{t('demoPortfolio', language)}</p>
          <p className="text-slate-400 text-xs">{t('demoPortfolioDesc', language)}</p>
          <p className="text-slate-400 text-xs">{t('demoPortfolioPrices', language)}</p>
        </div>
      </div>
    </div>
  );
};
