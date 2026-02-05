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
    try {
      // Normalize GitHub Pages base path: if path starts with /samuhlagna, strip it
      let normalizedUrl = new URL(request.url);
      if (normalizedUrl.pathname.startsWith('/samuhlagna')) {
        normalizedUrl.pathname = normalizedUrl.pathname.replace(/^\/samuhlagna/, '') || '/';
      }

      // Use pathname + search when requesting assets from the assets binding
      const assetPath = normalizedUrl.pathname + normalizedUrl.search;
      let assetResponse;
      try {
        assetResponse = await env.ASSETS.fetch(assetPath);
      } catch (e) {
        console.error('env.ASSETS.fetch error for', assetPath, e);
        // Fallback: serve index.html for SPA routes if asset fetch fails
        try {
          return await env.ASSETS.fetch('/index.html');
        } catch (e2) {
          console.error('env.ASSETS.fetch index.html error', e2);
          throw e2;
        }
      }

      // If asset not found, return index.html for SPA routing
      if (assetResponse.status === 404) {
        // Serve index.html for SPA routes
        try {
          const indexReq = new Request('/index.html', request);
          return await env.ASSETS.fetch(indexReq);
        } catch (e) {
          console.error('env.ASSETS.fetch index.html error', e);
          throw e;
        }
      }

      return assetResponse;
    } catch (err) {
      console.error('Asset fetch error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
