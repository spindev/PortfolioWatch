import { Settings } from '../types';

const STORAGE_KEY = 'portfoliowatch_settings';
const DEFAULT_SETTINGS: Settings = { language: 'de', currency: 'EUR' };

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: Partial<Settings> = JSON.parse(raw);
    const language = parsed.language === 'de' || parsed.language === 'en'
      ? parsed.language
      : DEFAULT_SETTINGS.language;
    const currency = parsed.currency === 'EUR' || parsed.currency === 'USD'
      ? parsed.currency
      : DEFAULT_SETTINGS.currency;
    return { language, currency };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
