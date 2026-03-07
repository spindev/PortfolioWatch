import { Language } from './types';

export const translations = {
  de: {
    // Header
    etfPortfolioTracker: 'ETF Portfolio Tracker',
    updated: 'Aktualisiert:',
    loading: 'Wird geladen…',
    priceFetchError: 'Fehler beim Abrufen der Kurse',
    goToPortfolio: 'Zum Portfolio',
    settings: 'Einstellungen',

    // Stat cards
    portfolioValue: 'Portfoliowert',
    totalCost: 'Gesamtkosten',
    totalGain: 'Gesamtgewinn',
    totalReturn: 'Gesamtrendite',
    investedCapital: 'Investiertes Kapital',
    absoluteReturn: 'Absoluter Gewinn',
    percentageReturn: 'Prozentuale Rendite',

    // Portfolio chart section
    portfolioDevelopment: 'Portfolio-Entwicklung',
    valueVsCostBasis: 'Wert vs. Kostenbasis über die Zeit',

    // ETF detail
    etfDetail: 'ETF Detail',
    sharesLabel: 'Anteile',
    currentLabel: 'Aktuell',
    sectorLabel: 'Sektor',

    // Allocation chart
    allocationByEtf: 'Allokation nach ETF',
    portfolioWeightPerPosition: 'Portfoliogewicht pro Position',

    // Holdings table
    holdings: 'Positionen',
    allEtfPositions: 'Alle ETF-Positionen und Performance',
    colEtf: 'ETF',
    colShares: 'Anteile',
    colAvgBuy: 'Ø Kaufkurs',
    colCurrent: 'Aktuell',
    colValue: 'Wert',
    colPnl: 'G/V',
    colPnlPct: 'G/V %',
    colAllocation: 'Allokation',
    clickRowToView: 'Zeile anklicken für Kursentwicklung',

    // Chart tooltips
    tooltipValue: 'Wert',
    tooltipCost: 'Kosten',
    tooltipPnl: 'G/V',
    costBasis: 'Kostenbasis',
    portfolioValueLabel: 'Portfoliowert',

    // General
    retry: 'Erneut versuchen',
    fetchingPrices: 'Lade Kurse von Yahoo Finance…',
    footer: 'PortfolioWatch — Kurse via Yahoo Finance',

    // Settings
    settingsTitle: 'Einstellungen',
    settingsSubtitle: 'PortfolioWatch konfigurieren',
    languageLabel: 'Sprache',
    currencyLabel: 'Währung',
    save: 'Speichern',
    savedConfirm: '✓ Gespeichert',
    demoPortfolio: 'Demo-Portfolio',
    demoPortfolioDesc: 'World (URTH) · EM (EEM) · ESG Europe (LCEU.SW) — je 100 Anteile',
    demoPortfolioPrices: 'Kurse via Yahoo Finance · Kaufkurs = Kurs vor 1 Jahr',
    langDe: 'Deutsch',
    langEn: 'Englisch',
    currEur: 'Euro (€)',
    currUsd: 'Dollar ($)',
  },

  en: {
    // Header
    etfPortfolioTracker: 'ETF Portfolio Tracker',
    updated: 'Updated:',
    loading: 'Loading…',
    priceFetchError: 'Price fetch error',
    goToPortfolio: 'Go to portfolio',
    settings: 'Settings',

    // Stat cards
    portfolioValue: 'Portfolio Value',
    totalCost: 'Total Cost',
    totalGain: 'Total Gain',
    totalReturn: 'Total Return',
    investedCapital: 'Invested capital',
    absoluteReturn: 'Absolute return',
    percentageReturn: 'Percentage return',

    // Portfolio chart section
    portfolioDevelopment: 'Portfolio Development',
    valueVsCostBasis: 'Value vs. Cost Basis over time',

    // ETF detail
    etfDetail: 'ETF Detail',
    sharesLabel: 'shares',
    currentLabel: 'Current',
    sectorLabel: 'Sector',

    // Allocation chart
    allocationByEtf: 'Allocation by ETF',
    portfolioWeightPerPosition: 'Portfolio weight per position',

    // Holdings table
    holdings: 'Holdings',
    allEtfPositions: 'All ETF positions and performance',
    colEtf: 'ETF',
    colShares: 'Shares',
    colAvgBuy: 'Avg. Buy',
    colCurrent: 'Current',
    colValue: 'Value',
    colPnl: 'P&L',
    colPnlPct: 'P&L %',
    colAllocation: 'Allocation',
    clickRowToView: 'Click a row to view its price development',

    // Chart tooltips
    tooltipValue: 'Value',
    tooltipCost: 'Cost',
    tooltipPnl: 'P&L',
    costBasis: 'Cost Basis',
    portfolioValueLabel: 'Portfolio Value',

    // General
    retry: 'Retry',
    fetchingPrices: 'Fetching live prices from Yahoo Finance…',
    footer: 'PortfolioWatch — Live prices via Yahoo Finance',

    // Settings
    settingsTitle: 'Settings',
    settingsSubtitle: 'Configure how PortfolioWatch behaves',
    languageLabel: 'Language',
    currencyLabel: 'Currency',
    save: 'Save',
    savedConfirm: '✓ Saved',
    demoPortfolio: 'Demo Portfolio',
    demoPortfolioDesc: 'World (URTH) · EM (EEM) · ESG Europe (LCEU.SW) — 100 shares each',
    demoPortfolioPrices: 'Prices fetched from Yahoo Finance · Buy price = price 1 year ago',
    langDe: 'German',
    langEn: 'English',
    currEur: 'Euro (€)',
    currUsd: 'Dollar ($)',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key];
}

export function getLocale(lang: Language): string {
  return lang === 'de' ? 'de-DE' : 'en-US';
}

export function getCurrencySymbol(currency: string): string {
  return currency === 'EUR' ? '€' : '$';
}
