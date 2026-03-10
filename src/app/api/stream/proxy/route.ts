import { NextRequest, NextResponse } from 'next/server';

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Rewrite URLs in HLS m3u8 playlist to go through our proxy
 * This ensures all segment URLs also go through the proxy to avoid CORS
 */
function rewriteM3U8Content(content: string, baseUrl: string, proxyBaseUrl: string): string {
  const lines = content.split('\n');
  const baseUrlObj = new URL(baseUrl);
  const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
  
  return lines.map(line => {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments (except URI in EXT-X tags)
    if (!trimmedLine || (trimmedLine.startsWith('#') && !trimmedLine.includes('URI='))) {
      // Handle URI="..." in tags like #EXT-X-KEY
      if (trimmedLine.includes('URI="')) {
        return trimmedLine.replace(/URI="([^"]+)"/, (match, uri) => {
          const absoluteUri = resolveUrl(uri, baseDir, baseUrlObj);
          return `URI="${proxyBaseUrl}?url=${encodeURIComponent(absoluteUri)}&referer=${encodeURIComponent(baseUrlObj.origin + '/')}"`;
        });
      }
      return line;
    }
    
    // Skip EXT tags without URIs
    if (trimmedLine.startsWith('#')) {
      return line;
    }
    
    // This is a URL line (segment or playlist)
    const absoluteUrl = resolveUrl(trimmedLine, baseDir, baseUrlObj);
    return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(baseUrlObj.origin + '/')}`;
  }).join('\n');
}

/**
 * Resolve relative URL to absolute URL
 */
function resolveUrl(url: string, baseDir: string, baseUrlObj: URL): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return baseUrlObj.protocol + url;
  }
  if (url.startsWith('/')) {
    return baseUrlObj.origin + url;
  }
  // Relative URL
  return baseDir + url;
}

/**
 * Check if URL is an HLS playlist
 */
function isHlsPlaylist(url: string, contentType: string | null): boolean {
  const urlLower = url.toLowerCase();
  const ctLower = (contentType || '').toLowerCase();
  
  return urlLower.includes('.m3u8') || 
         urlLower.includes('.m3u') ||
         ctLower.includes('application/vnd.apple.mpegurl') ||
         ctLower.includes('application/x-mpegurl') ||
         ctLower.includes('audio/mpegurl');
}

/**
 * Check if URL is an HLS segment
 */
function isHlsSegment(url: string): boolean {
  const urlLower = url.toLowerCase();
  return urlLower.includes('.ts') || 
         urlLower.includes('.m4s') || 
         urlLower.includes('.mp4') ||
         urlLower.includes('.aac');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const referer = searchParams.get('referer');
    const origin = searchParams.get('origin');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    console.log(`[PROXY] Request for: ${url.substring(0, 100)}...`);

    // Validate URL
    let videoUrl: URL;
    try {
      videoUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Build headers for the request (like Python get_browser_headers)
    const headers: HeadersInit = {
      'User-Agent': getRandomUserAgent(),
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity', // Don't request compression for easier handling
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    // Add referer if provided or construct from URL
    if (referer) {
      headers['Referer'] = referer;
      headers['Origin'] = origin || new URL(referer).origin;
    } else {
      headers['Referer'] = videoUrl.origin + '/';
      headers['Origin'] = videoUrl.origin;
    }

    // Handle range requests for video seeking
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    // Fetch the content
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok && response.status !== 206) {
      console.error(`[PROXY] Fetch failed: ${response.status} ${response.statusText} for ${url.substring(0, 80)}`);
      return NextResponse.json(
        { success: false, error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    // Get content type from response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    // Build proxy base URL for rewriting
    const proxyBaseUrl = '/api/stream/proxy';

    // Check if this is an HLS playlist that needs rewriting
    const isPlaylist = isHlsPlaylist(url, contentType);
    
    if (isPlaylist) {
      console.log(`[PROXY] Processing HLS playlist: ${url.substring(0, 80)}`);
      
      // Read the entire playlist content
      const playlistContent = await response.text();
      
      // Rewrite URLs in the playlist
      const rewrittenContent = rewriteM3U8Content(playlistContent, url, proxyBaseUrl);
      
      // Return rewritten playlist
      return new NextResponse(rewrittenContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
          'Cache-Control': 'no-cache', // Don't cache playlists
        },
      });
    }

    // For video segments and other files, stream directly
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Cache-Control': 'public, max-age=3600',
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    if (acceptRanges) {
      responseHeaders['Accept-Ranges'] = acceptRanges;
    } else {
      responseHeaders['Accept-Ranges'] = 'bytes';
    }

    // Stream the response
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[PROXY] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
