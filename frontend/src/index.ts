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
      // Strip /api prefix and forward to Railway
      const pathWithoutApi = url.pathname.substring(4); // Remove "/api"
      const railwayUrl = RAILWAY_API_URL + pathWithoutApi + url.search;

      console.log(`Proxying ${request.method} ${url.pathname} -> ${railwayUrl}`);

      try {
        const railwayRequest = new Request(railwayUrl, {
          method: request.method,
          headers: new Headers(request.headers),
          body: request.body,
        });

        const response = await fetch(railwayRequest);
        
        // Add CORS headers to response
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        return newResponse;
      } catch (error) {
        console.error('Proxy error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: 'Proxy error', details: errorMessage }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Serve static assets (frontend)
    return env.ASSETS.fetch(request);
  },
};
