/**
 * Cloudflare Worker: Yahoo Finance CORS Proxy for PortfolioWatch
 *
 * This worker proxies requests to query2.finance.yahoo.com and attaches the
 * CORS headers required for the GitHub Pages frontend to fetch market data
 * directly — without relying on third-party CORS proxy services.
 *
 * Deploy:
 *   npm install -g wrangler
 *   wrangler login
 *   wrangler deploy
 *
 * After deploying, set the worker URL in the Vite/GitHub Actions environment:
 *   VITE_YF_PROXY_URL=https://portfoliowatch-yf-proxy.<account>.workers.dev
 */

const ALLOWED_ORIGIN = 'https://spindev.github.io';
const YF_BASE = 'https://query2.finance.yahoo.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Forward the request to Yahoo Finance
    const yfUrl = `${YF_BASE}${url.pathname}${url.search}`;
    const yfResponse = await fetch(yfUrl, {
      headers: {
        // Mimic a regular browser request so Yahoo Finance doesn't reject it
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    // Stream the response back with CORS headers attached
    return new Response(yfResponse.body, {
      status: yfResponse.status,
      headers: {
        'Content-Type': yfResponse.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'public, max-age=300',
        ...CORS_HEADERS,
      },
    });
  },
};
