/**
 * Cloudflare Workers Proxy
 * Serves static assets + proxies /api/* requests to Railway backend
 * This bypasses Jio ISP blocking of railway.app domains
 */

const RAILWAY_API_URL = 'https://samuhlagna-production.up.railway.app';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // Define paths that should go directly to backend (Swagger/FastAPI docs)
    const directProxyPaths = ['/docs', '/redoc', '/openapi.json'];
    const isApiRequest = url.pathname.startsWith('/api');
    const isDirectProxy = directProxyPaths.some(path => url.pathname.startsWith(path));

    // Proxy logic: /api/* (stripped) OR specific backend paths (direct)
    if (isApiRequest || isDirectProxy) {
      let railwayUrl;
      if (isApiRequest) {
        // Strip /api prefix for standard API calls
        railwayUrl = RAILWAY_API_URL + url.pathname.substring(4) + url.search;
      } else {
        // Pass through directly for docs/openapi
        railwayUrl = RAILWAY_API_URL + url.pathname + url.search;
      }

      console.log(`Proxying ${request.method} ${url.pathname} -> ${railwayUrl}`);

      try {
        // Prepare headers: Copy original headers but update Host to match backend
        const proxyHeaders = new Headers(request.headers);
        const backendUrlObj = new URL(RAILWAY_API_URL);
        proxyHeaders.set('Host', backendUrlObj.host);

        const railwayRequest = new Request(railwayUrl, {
          method: request.method,
          headers: proxyHeaders,
          body: request.body,
          redirect: 'follow',
        });

        const response = await fetch(railwayRequest);
        
        // Create a new response to allow header modification
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (error) {
        console.error('Proxy error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: 'Proxy error', details: errorMessage }), {
          status: 502,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
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
      let assetPath = (normalizedUrl.pathname || '/') + normalizedUrl.search;
      // Map root to index.html for assets binding
      if (assetPath === '/' || assetPath === '') {
        assetPath = '/index.html';
      }

      let assetResponse;
      try {
        assetResponse = await env.ASSETS.fetch(new Request(assetPath, request));
      } catch (e) {
        console.error('env.ASSETS.fetch error for', assetPath, e);
        // Fallback: try index.html
        try {
          assetResponse = await env.ASSETS.fetch(new Request('/index.html', request));
        } catch (e2) {
          console.error('env.ASSETS.fetch index.html error', e2);
          throw e2;
        }
      }

      let finalResponse = assetResponse;

      // If asset not found, return index.html for SPA routing
      if (assetResponse.status === 404) {
        // Serve index.html for SPA routes
        try {
          const indexReq = new Request('/index.html', request);
          finalResponse = await env.ASSETS.fetch(indexReq);
        } catch (e) {
          console.error('env.ASSETS.fetch index.html error', e);
          throw e;
        }
      }

      // Apply Cache-Control headers
      const response = new Response(finalResponse.body, {
        status: finalResponse.status,
        statusText: finalResponse.statusText,
        headers: new Headers(finalResponse.headers),
      });

      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        // Don't cache HTML to ensure updates are seen immediately
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        // Cache static assets (JS, CSS, Images) for 1 year
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      }

      return response;
    } catch (err) {
      console.error('Asset fetch error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
