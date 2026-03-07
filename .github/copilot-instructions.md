# PortfolioWatch – Copilot Custom Instructions

## Project Overview
- **React 19 + TypeScript + Vite + Tailwind CSS + Recharts**
- German UI (`de-DE` locale, all labels in German)
- No test framework (no Jest/Vitest)
- Build: `npm run build` (`tsc -b && vite build`)
- Dev server: `npm run dev`
- Lint: `npm run lint` (note: ESLint config file is missing – pre-existing issue)

## Repository Structure
```
src/
  components/
    AllocationChart.tsx  – Recharts donut pie chart, portfolio weight by ETF
    HoldingsTable.tsx    – Responsive table (desktop) + card list (mobile)
    PortfolioChart.tsx   – Recharts area chart, portfolio value vs. cost basis
    SectorChart.tsx      – Recharts horizontal bar chart, value by asset class
    StatCard.tsx         – Summary stat cards (value, cost, gain, return %)
    Header.tsx           – Navigation bar (logo, last-update timestamp, settings)
    SettingsPage.tsx     – Theme toggle (light/dark) overlay
  data/
    etfs.json            – Static ETF definitions (ticker, name, shares, sector)
    mockData.ts          – Mock historical data
  services/
    financeService.ts    – Yahoo Finance API fetch, buildHoldings, buildPortfolioHistory
    settingsService.ts   – LocalStorage-backed settings (theme)
  utils/
    calculations.ts      – Pure helpers: gain, percent, formatCurrency, formatPercent
  types.ts               – Shared TypeScript interfaces (Holding, PortfolioSnapshot, Settings)
  App.tsx                – Root component: state management, page layout
  main.tsx               – React entry point
```

## Key Architecture Notes
- **No router** – page state (`'portfolio' | 'settings'`) managed via `useState` in `App.tsx`
- **Theme** – Tailwind `dark:` variants driven by `.dark` class on `<html>`; toggled in `App.tsx` via `useEffect`
- **Data flow** – `financeService.ts` fetches Yahoo Finance on load; `App.tsx` holds all state; components are presentational
- **Currency/locale constants** – `CURRENCY = 'EUR'`, `LOCALE = 'de-DE'` defined at the top of `App.tsx` and `HoldingsTable.tsx`

## AllocationChart (Pie Chart) Layout
- Container: `h-[260px] sm:h-[300px]`
- `cy="46%"` to shift donut up above the legend
- `<Legend verticalAlign="bottom" height={36}>`  reserves space for ticker legend
- `isAnimationActive={false}` prevents layout glitches on first render

## Conventions
- All user-facing strings are in German
- Tailwind utility classes only – no custom CSS except `src/index.css` variables
- Formatting: 2-space indent, single quotes, explicit return types on React components
- Component files export a named `const` (e.g. `export const AllocationChart`)
