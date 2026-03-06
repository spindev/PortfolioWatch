# PortfolioWatch

A dark-themed ETF portfolio tracker running on [GitHub Pages](https://spindev.github.io/PortfolioWatch/).

## Features

- 📊 **Portfolio Development Chart** — Area chart showing portfolio value vs. cost basis over time (1M / 3M / 6M / 1Y / ALL)
- 🍩 **Allocation by ETF** — Donut chart showing portfolio weight per ETF position
- 📊 **Allocation by Sector** — Horizontal bar chart showing value distribution by asset class
- 📋 **Holdings Table** — Full breakdown of positions including avg. buy price, current price, P&L, and allocation bars
- 🌑 **Dark Theme** — Slate-950 background with blue accents, fully responsive

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for fast builds
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Recharts](https://recharts.org/) for charts and graphs
- [GitHub Actions](https://github.com/features/actions) for CI/CD to GitHub Pages

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173/PortfolioWatch/](http://localhost:5173/PortfolioWatch/).

## Build & Deploy

```bash
npm run build
```

The app is automatically deployed to GitHub Pages on every push to `main`.

## Roadmap

The following features are planned for future development:

- **CSV Import** — Upload transaction history via CSV file (date, ticker, shares, price, fee) to populate portfolio with real data
- **Transaction History** — View and manage individual buy/sell transactions per ETF
- **Purchase Margin Analysis** — See P&L development per individual purchase/lot
- **Live Price Feed** — Integrate a price data API (e.g., Yahoo Finance) to update ETF prices automatically
- **Portfolio Rebalancing** — Target allocation management and rebalancing suggestions
- **Multiple Portfolios** — Support for managing multiple separate portfolios
- **Export** — Export portfolio data and charts as PDF or image
