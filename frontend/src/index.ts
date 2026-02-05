/**
 * Cloudflare Workers Proxy
 * Serves static assets + proxies /api/* requests to Railway backend
 * This bypasses Jio ISP blocking of railway.app domains
 */

const RAILWAY_API_URL = 'https://samuhlagna-production.up.railway.app';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // Proxy all /api/* requests to Railway backend
    if (url.pathname.startsWith('/api')) {
      const railwayUrl = RAILWAY_API_URL + url.pathname + url.search;

      try {
        return await fetch(new Request(railwayUrl, {
          method: request.method,
          headers: new Headers(request.headers),
          body: request.body,
        }));
      } catch (error) {
        console.error('Proxy error:', error);
        return new Response('Proxy error', { status: 502 });
      }
    }

    // Serve static assets (frontend)
    return env.ASSETS.fetch(request);
  },
};
