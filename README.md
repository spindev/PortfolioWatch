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

## Production Setup — Yahoo Finance CORS Proxy

Browsers enforce the **Same-Origin Policy**: a page served from `spindev.github.io`
cannot read responses from `query2.finance.yahoo.com` unless Yahoo Finance explicitly
grants permission via `Access-Control-Allow-Origin` response headers — which it does
not. This is a browser security restriction that cannot be bypassed.

The solution is a small self-controlled proxy server that fetches from Yahoo Finance
**server-to-server** (where CORS does not apply) and then forwards the response to the
browser with the correct CORS header. The `vercel-proxy/` directory contains a
ready-to-deploy [Vercel](https://vercel.com) edge function that does exactly this.
Vercel is free for this scale (no credit card required).

### One-time setup (takes ~5 minutes)

**1. Deploy the Vercel proxy**

```bash
npm install -g vercel
cd vercel-proxy
vercel deploy --prod
```

On first run `vercel` opens a browser to log in with your GitHub account. Note the
deployment URL printed at the end, e.g.
`https://portfoliowatch-yf-proxy.vercel.app`.

**2. Add the URL as a GitHub Actions repository secret**

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Name | Value |
|---|---|
| `VITE_YF_PROXY_URL` | `https://portfoliowatch-yf-proxy.vercel.app` |

Vite reads this variable at **build time** (not runtime) and bakes it into the
JavaScript bundle. GitHub Pages hosts the resulting static files — no runtime
environment configuration is needed on GitHub Pages itself.

**3. Trigger a new deployment**

Push any commit to `main` (or manually trigger the workflow). The build will pick up
the secret and the live site will start fetching market data through your own proxy.

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
