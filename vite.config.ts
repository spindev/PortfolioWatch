import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { gunzipSync } from 'node:zlib'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ─── Gettex dev-server proxy ──────────────────────────────────────────────────
// In development, the browser cannot download and decompress a gzipped CSV
// directly, so a Vite middleware intercepts /api/gettex/quotes and performs the
// Gettex posttrade CSV fetch + parse inside Node.js, returning clean JSON.
// Results are cached for 5 minutes so repeated hot-reloads are cheap.

const GETTEX_LISTING_URL = 'https://www.gettex.de/handel/delayed-data/posttrade-data/'

async function getLatestGettexUrl(marketType: 'mund' | 'munc'): Promise<string> {
  const res = await fetch(GETTEX_LISTING_URL)
  if (!res.ok) throw new Error(`Gettex listing page returned HTTP ${res.status}`)
  const html = await res.text()
  const urlRegex = /https?:\/\/erdk\.bayerische-boerse\.de[^\s"'<>]+\.csv\.gz/g
  const urls = [...html.matchAll(urlRegex)]
    .map((m) => m[0])
    .filter((url) => url.includes(`.${marketType}.`))
  if (urls.length === 0) throw new Error(`No Gettex ${marketType.toUpperCase()} files found`)
  return urls[urls.length - 1]
}

async function parseGettexCsvBuffer(
  buffer: Buffer,
  targetIsins: Set<string>,
): Promise<Map<string, { price: number; currency: string }>> {
  const text = gunzipSync(buffer).toString('utf8')
  const prices = new Map<string, { price: number; currency: string }>()
  // Row format (no header, no quoted fields): ISIN,TIME,CURRENCY,PRICE,AMOUNT
  // All fields are fixed-format tokens (12-char ISIN, time, 3-char currency,
  // numeric price, integer amount) so a plain split(',') is safe here.
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const parts = line.split(',')
    if (parts.length < 4) continue
    const isin = parts[0].trim()
    if (!targetIsins.has(isin)) continue
    const currency = parts[2].trim() || 'EUR'
    const price = parseFloat(parts[3])
    if (price > 0) prices.set(isin, { price, currency })
  }
  return prices
}

function gettexDevPlugin(): Plugin {
  let cacheData: Array<{ isin: string; price: number; currency: string }> = []
  let cacheExpiry = 0
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  return {
    name: 'gettex-dev-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/api/gettex/quotes',
        async (req: IncomingMessage, res: ServerResponse) => {
          res.setHeader('Content-Type', 'application/json')
          try {
            // Serve from cache if still fresh
            if (Date.now() < cacheExpiry) {
              res.end(JSON.stringify(cacheData))
              return
            }

            const isinParam =
              new URL(req.url ?? '/', 'http://localhost').searchParams.get('isins') ?? ''
            const targetIsins = new Set(isinParam.split(',').filter(Boolean))

            const prices = new Map<string, { price: number; currency: string }>()
            for (const marketType of ['mund', 'munc'] as const) {
              try {
                const csvUrl = await getLatestGettexUrl(marketType)
                const csvRes = await fetch(csvUrl)
                if (!csvRes.ok) continue
                const buf = Buffer.from(await csvRes.arrayBuffer())
                const marketPrices = await parseGettexCsvBuffer(buf, targetIsins)
                for (const [isin, data] of marketPrices) {
                  if (!prices.has(isin)) prices.set(isin, data)
                }
              } catch (err) {
                server.config.logger.warn(`[gettex-dev-proxy] ${marketType} failed: ${err}`)
              }
            }

            cacheData = [...prices.entries()].map(([isin, d]) => ({ isin, ...d }))
            cacheExpiry = Date.now() + CACHE_TTL
            res.end(JSON.stringify(cacheData))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(err) }))
          }
        },
      )
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react(), gettexDevPlugin()],
  base: '/PortfolioWatch/',
  server: {
    proxy: {
      '/api/yf': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yf/, ''),
      },
    },
  },
})
