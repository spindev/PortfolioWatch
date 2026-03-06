import { Settings } from '../types';

const STORAGE_KEY = 'portfoliowatch_settings';
const DEFAULT_SETTINGS: Settings = { refreshInterval: 30 };
const MIN_REFRESH_INTERVAL = 5;

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: Partial<Settings> = JSON.parse(raw);
    const refreshInterval = typeof parsed.refreshInterval === 'number'
      ? Math.max(MIN_REFRESH_INTERVAL, parsed.refreshInterval)
      : DEFAULT_SETTINGS.refreshInterval;
    return { refreshInterval };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
