/**
 * Streaming Service - VOE.sx Restreaming Implementation
 * Ported from Python streaming_server.py to Next.js
 */

// In-memory cache for resolved sources
interface CacheEntry {
  direct_url: string;
  expires: number;
}

const RESOLVE_CACHE: Map<string, CacheEntry> = new Map();
const RESOLVE_TTL = 30 * 60 * 1000; // 30 minutes in ms

// User agents for rotation
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

// Bait patterns to avoid
const BAIT_PATTERNS = [
  "BigBuckBunny.mp4",
  "Big_Buck_Bunny",
  "test-videos.co.uk",
  "sample-videos",
  "demo-videos"
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getBrowserHeaders(url?: string): HeadersInit {
  const parsed = url ? new URL(url) : null;
  const referer = parsed ? `${parsed.protocol}//${parsed.host}/` : "";

  const headers: HeadersInit = {
    "User-Agent": getRandomUserAgent(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": referer ? "same-origin" : "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    "DNT": "1",
  };

  if (referer) {
    headers["Referer"] = referer;
  }

  return headers;
}

function isBaitSource(source: string): boolean {
  return BAIT_PATTERNS.some(bait => source.includes(bait));
}

function cacheGet(url: string): string | null {
  const entry = RESOLVE_CACHE.get(url);
  if (!entry) return null;
  
  if (entry.expires < Date.now()) {
    RESOLVE_CACHE.delete(url);
    return null;
  }
  
  return entry.direct_url;
}

function cacheSet(url: string, directUrl: string): void {
  RESOLVE_CACHE.set(url, {
    direct_url: directUrl,
    expires: Date.now() + RESOLVE_TTL
  });
}

/**
 * Clean base64 string by fixing padding
 */
function cleanBase64(s: string): string | null {
  try {
    let cleaned = s.replace(/\\/g, '');
    const missingPadding = cleaned.length % 4;
    if (missingPadding) {
      cleaned += '='.repeat(4 - missingPadding);
    }
    // Validate by attempting to decode
    atob(cleaned);
    return cleaned;
  } catch {
    return null;
  }
}

/**
 * ROT13 decode helper
 */
function rot13Decode(s: string): string {
  return s.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    const base = code >= 97 ? 97 : 65;
    return String.fromCharCode(((code - base + 13) % 26) + base);
  });
}

/**
 * Shift characters by offset
 */
function shiftCharacters(s: string, offset: number): string {
  return s.split('').map(c => String.fromCharCode(c.charCodeAt(0) - offset)).join('');
}

/**
 * Apply token replacements for VOE encoding
 * Replaces special token sequences with underscore
 */
function applyTokenReplacements(s: string): string {
  const tokens = ['@$', '^^', '~@', '%?', '*~', '!!', '#&'];
  let result = s;
  for (const token of tokens) {
    if (result.includes(token)) {
      result = result.split(token).join('_');
    }
  }
  return result;
}

/**
 * Safe base64 decode with normalization
 */
function safeAtob(input: string, context: string = 'base64'): string {
  if (!input) {
    throw new Error(`Empty base64 input (${context})`);
  }

  const normalize = (value: string): string => {
    let normalized = value.replace(/\s+/g, '')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padding = normalized.length % 4;
    if (padding) {
      normalized += '='.repeat(4 - padding);
    }
    return normalized;
  };

  const sanitized = input.replace(/\\/g, '');

  try {
    return atob(normalize(sanitized));
  } catch (primaryErr) {
    // Strip non-base64 characters and try again
    const stripped = sanitized.replace(/[^A-Za-z0-9+/=]/g, '');
    try {
      return atob(normalize(stripped));
    } catch (secondaryErr) {
      console.error(`[RESOLVE][VOE] safeAtob failed for ${context}:`, secondaryErr);
      throw secondaryErr;
    }
  }
}

export interface ResolveResult {
  success: boolean;
  direct_url?: string;
  error?: string;
  cached?: boolean;
}

// Known VOE mirror domains (expanded list)
const VOE_DOMAINS = [
  'voe.sx',
  'voe',
  'walterprettytheir.com',
  'growingawarded.com',
  'launchreliantcloth.com',
  'steadicamjob.com',
  'deliverynightmares.com',
  'reaborede.com',
  'yourupload.com',
  'voeun-block.net',
  'voeunblk.com',
  'voe-un-block.com',
  'audaciousdefaulthouse.com',
  'dololotrede.com',
  'ufrede.com',
];

/**
 * Check if URL is a VOE domain
 */
function isVoeDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return VOE_DOMAINS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Extract direct video URL from VOE.sx embed page
 * @param embedUrl - URL to resolve
 * @param visitedUrls - Set of already visited URLs to prevent infinite loops
 */
export async function resolveVoeSource(embedUrl: string, visitedUrls: Set<string> = new Set()): Promise<ResolveResult> {
  try {
    console.log(`[RESOLVE][VOE] Start resolving: ${embedUrl}`);

    // Prevent infinite redirect loops
    if (visitedUrls.has(embedUrl)) {
      console.log(`[RESOLVE][VOE] Detected redirect loop, stopping`);
      return { success: false, error: 'Redirect loop detected' };
    }
    visitedUrls.add(embedUrl);

    // Limit max redirects
    if (visitedUrls.size > 5) {
      console.log(`[RESOLVE][VOE] Too many redirects (${visitedUrls.size}), stopping`);
      return { success: false, error: 'Too many redirects' };
    }

    // Check cache first
    const cached = cacheGet(embedUrl);
    if (cached) {
      console.log(`[RESOLVE][VOE] Cache hit: ${cached}`);
      return { success: true, direct_url: cached, cached: true };
    }

    // Fetch embed page
    const headers = getBrowserHeaders(embedUrl);
    const response = await fetch(embedUrl, {
      headers,
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log(`[RESOLVE][VOE] HTTP ${response.status} on initial fetch`);
      return { success: false, error: `HTTP ${response.status} fetching embed` };
    }

    const htmlText = await response.text();
    let directUrl: string | null = null;

    // Check for redirects first (like Python version does)
    const redirectPatterns = [
      "window.location.href = '",
      "window.location = '",
      "location.href = '",
      "window.location.replace('",
      "window.location.assign('",
      'window.location="',
      'window.location.href="'
    ];

    for (const pattern of redirectPatterns) {
      const patternIndex = htmlText.indexOf(pattern);
      if (patternIndex !== -1) {
        const closingQuote = pattern.endsWith("'") ? "'" : '"';
        const endIndex = htmlText.indexOf(closingQuote, patternIndex + pattern.length);
        if (endIndex > patternIndex) {
          const redirectUrl = htmlText.slice(patternIndex + pattern.length, endIndex);
          
          // Skip if redirect is to the same URL (infinite loop)
          if (redirectUrl === embedUrl || visitedUrls.has(redirectUrl)) {
            console.log(`[RESOLVE][VOE] Skipping same-URL redirect: ${redirectUrl}`);
            break; // Continue with pattern matching instead
          }
          
          console.log(`[RESOLVE][VOE] Detected redirect to: ${redirectUrl}`);
          // Recursively resolve the redirect URL, passing visited URLs
          return resolveVoeSource(redirectUrl, visitedUrls);
        }
      }
    }

    // ========================================
    // PRIORITY: Check encoded sources FIRST (they contain real video)
    // Generic URL scanning will find bait video, so do encoded methods first
    // ========================================

    // PRIORITY 1: VOE config payload (application/json script or MKGMa)
    console.log(`[RESOLVE][VOE] Checking VOE config payload (priority method)...`);
    let encodedPayload: string | null = null;
    
    // Try script type="application/json" pattern first (newer VOE format including walterprettytheir.com)
    const configScriptMatch = htmlText.match(/<script\s+type=["']application\/json["']>([\s\S]*?)<\/script>/i);
    if (configScriptMatch) {
      try {
        const payload = JSON.parse(configScriptMatch[1].trim());
        if (Array.isArray(payload) && typeof payload[0] === 'string') {
          encodedPayload = payload[0].trim();
          console.log(`[RESOLVE][VOE] Found config payload via script tag (length ${encodedPayload.length})`);
        }
      } catch (configErr) {
        console.error('[RESOLVE][VOE] Failed to parse config script JSON:', configErr);
      }
    }
    
    // Fallback to legacy MKGMa pattern
    if (!encodedPayload) {
      const legacyMatch = htmlText.match(/MKGMa=["']([^"']+)["']/);
      if (legacyMatch) {
        encodedPayload = legacyMatch[1].trim();
        console.log(`[RESOLVE][VOE] Found legacy MKGMa payload (length ${encodedPayload.length})`);
      }
    }
    
    if (encodedPayload) {
      try {
        console.log(`[RESOLVE][VOE] Encoded payload sample: ${encodedPayload.substring(0, 100)}`);
        
        // Stage 1: ROT13 decode
        const stage1 = rot13Decode(encodedPayload);
        console.log(`[RESOLVE][VOE] After ROT13 (first 80 chars): ${stage1.substring(0, 80)}`);
        
        // Stage 2: Apply token replacements (@$, ^^, ~@, %?, *~, !!, #& -> _)
        const stage2 = applyTokenReplacements(stage1);
        console.log(`[RESOLVE][VOE] After token replacements (first 80 chars): ${stage2.substring(0, 80)}`);
        
        // Stage 3: Remove all underscores
        const stage3 = stage2.replace(/_/g, '');
        console.log(`[RESOLVE][VOE] After underscore removal (first 80 chars): ${stage3.substring(0, 80)}`);
        
        // Stage 4: First base64 decode
        let stage4: string;
        try {
          stage4 = safeAtob(stage3, 'VOE payload stage3');
          console.log(`[RESOLVE][VOE] First atob() succeeded (length ${stage4.length})`);
        } catch (firstDecodeErr) {
          console.error('[RESOLVE][VOE] First base64 decode failed:', firstDecodeErr);
          throw firstDecodeErr;
        }
        
        // Stage 5: Shift characters by -3
        const stage5 = shiftCharacters(stage4, 3);
        console.log(`[RESOLVE][VOE] After shifting -3 (first 80 chars): ${stage5.substring(0, 80)}`);
        
        // Stage 6: Reverse the string
        const stage6 = stage5.split('').reverse().join('');
        console.log(`[RESOLVE][VOE] After reverse (first 80 chars): ${stage6.substring(0, 80)}`);
        
        // Stage 7: Second base64 decode
        let finalDecoded: string;
        try {
          finalDecoded = safeAtob(stage6, 'VOE payload stage6');
          console.log(`[RESOLVE][VOE] Second atob() succeeded (length ${finalDecoded.length})`);
          console.log(`[RESOLVE][VOE] Final decoded JSON preview: ${finalDecoded.substring(0, 200)}`);
        } catch (secondDecodeErr) {
          console.error('[RESOLVE][VOE] Second base64 decode failed:', secondDecodeErr);
          throw secondDecodeErr;
        }
        
        // Try to parse as JSON
        try {
          const parsedJson = JSON.parse(finalDecoded);
          if (parsedJson.direct_access_url && !isBaitSource(parsedJson.direct_access_url)) {
            directUrl = parsedJson.direct_access_url;
            console.log(`[RESOLVE][VOE] ✓ Found via config payload (direct_access_url): ${directUrl}`);
          } else if (parsedJson.source && !isBaitSource(parsedJson.source)) {
            directUrl = parsedJson.source;
            console.log(`[RESOLVE][VOE] ✓ Found via config payload (source): ${directUrl}`);
          }
        } catch {
          // Not valid JSON, try regex extraction
          const mp4Match = finalDecoded.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/i);
          const m3u8Match = finalDecoded.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
          
          if (mp4Match && !isBaitSource(mp4Match[1])) {
            directUrl = mp4Match[1];
            console.log(`[RESOLVE][VOE] ✓ Extracted MP4 from decoded payload: ${directUrl}`);
          } else if (m3u8Match && !isBaitSource(m3u8Match[1])) {
            directUrl = m3u8Match[1];
            console.log(`[RESOLVE][VOE] ✓ Extracted M3U8 from decoded payload: ${directUrl}`);
          }
        }
      } catch (decodeErr) {
        console.error('[RESOLVE][VOE] Error decoding VOE payload:', decodeErr);
      }
    }

    // PRIORITY 2: a168c encoded sources (base64)
    if (!directUrl) {
      console.log(`[RESOLVE][VOE] Searching for a168c encoded sources...`);
      const a168cMatch = htmlText.match(/a168c\s*=\s*'([^']+)'/);
      if (a168cMatch) {
        const rawBase64 = a168cMatch[1];
        try {
          const cleaned = cleanBase64(rawBase64);
          if (cleaned) {
            const decodedBytes = atob(cleaned);
            const decoded = decodedBytes.split('').reverse().join('');
            console.log(`[RESOLVE][VOE] a168c decoded length: ${decoded.length}`);
            
            try {
              const parsed = JSON.parse(decoded);
              if (parsed.direct_access_url && !isBaitSource(parsed.direct_access_url)) {
                directUrl = parsed.direct_access_url;
                console.log(`[RESOLVE][VOE] ✓ Found direct_access_url in a168c JSON`);
              } else if (parsed.source && !isBaitSource(parsed.source)) {
                directUrl = parsed.source;
                console.log(`[RESOLVE][VOE] ✓ Found source in a168c JSON`);
              }
            } catch {
              const mp4Match = decoded.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/);
              const m3u8Match = decoded.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
              
              if (mp4Match && !isBaitSource(mp4Match[1])) {
                directUrl = mp4Match[1];
                console.log(`[RESOLVE][VOE] ✓ Found base64 encoded MP4 URL from a168c`);
              } else if (m3u8Match && !isBaitSource(m3u8Match[1])) {
                directUrl = m3u8Match[1];
                console.log(`[RESOLVE][VOE] ✓ Found base64 encoded HLS URL from a168c`);
              }
            }
          }
        } catch (e) {
          console.log(`[RESOLVE][VOE] Failed to decode a168c string: ${e}`);
        }
      }
    }

    // ========================================
    // FALLBACK: Standard pattern matching (may find bait)
    // ========================================

    // Pattern 1: var sources pattern (like Python)
    if (!directUrl) {
      const varSourcesMatch = htmlText.match(/var\s+sources\s*=\s*(\[[\s\S]*?\]);/);
      if (varSourcesMatch) {
        try {
          const sourcesStr = varSourcesMatch[1]
            .replace(/'/g, '"')
            .replace(/\n/g, '')
            .replace(/,\s*\]/, ']');
          const sources = JSON.parse(sourcesStr);
          if (sources && sources.length > 0 && sources[0].file && !isBaitSource(sources[0].file)) {
            directUrl = sources[0].file;
            console.log(`[RESOLVE][VOE] Found via var sources: ${directUrl}`);
          }
        } catch (e) {
          console.log(`[RESOLVE][VOE] Failed to parse var sources: ${e}`);
        }
      }
    }

    // Pattern 2: sources array with JSON-style
    if (!directUrl) {
      const sourcesArrayMatch = htmlText.match(new RegExp('sources\\s*[:=]\\s*\\[(.*?)\\]', 's'));
      if (sourcesArrayMatch) {
        const block = sourcesArrayMatch[1];
        if (!isBaitSource(block)) {
          const fileMatch = block.match(/file"?\s*:?\s*"(https:[^"]+?\.(?:mp4|m3u8))"/);
          if (fileMatch && !isBaitSource(fileMatch[1])) {
            directUrl = fileMatch[1];
            console.log(`[RESOLVE][VOE] Found via sources array: ${directUrl}`);
          }
        }
      }
    }

    // Pattern 3: generic file attribute
    if (!directUrl) {
      const fileAttrMatch = htmlText.match(/file"?\s*:?\s*"(https:[^"]+?\.(?:mp4|m3u8))"/);
      if (fileAttrMatch && !isBaitSource(fileAttrMatch[1])) {
        directUrl = fileAttrMatch[1];
        console.log(`[RESOLVE][VOE] Found via file attribute: ${directUrl}`);
      }
    }

    // Pattern 4: master playlist
    if (!directUrl) {
      const masterMatch = htmlText.match(/(https:[^"']+?master\.m3u8[^"']*)/);
      if (masterMatch && !isBaitSource(masterMatch[1])) {
        directUrl = masterMatch[1];
        console.log(`[RESOLVE][VOE] Found via master.m3u8: ${directUrl}`);
      }
    }

    // Pattern 5: data-file or data-src attributes
    if (!directUrl) {
      const dataMatch = htmlText.match(/data-(?:file|src)="(https:[^"]+?\.(?:mp4|m3u8))"/);
      if (dataMatch && !isBaitSource(dataMatch[1])) {
        directUrl = dataMatch[1];
        console.log(`[RESOLVE][VOE] Found via data-file/src: ${directUrl}`);
      }
    }

    // Pattern 6: all mp4/hls candidates (pick first non-bait)
    if (!directUrl) {
      const candidates = htmlText.match(/(https:[^"']+?\.(?:mp4|m3u8)[^"']*)/g);
      if (candidates && candidates.length > 0) {
        const validCandidate = candidates.find(c => !isBaitSource(c));
        if (validCandidate) {
          directUrl = validCandidate;
          console.log(`[RESOLVE][VOE] Picked first valid candidate: ${directUrl}`);
        }
      }
    }

    // Pattern 7: Packed eval extraction (like Python)
    if (!directUrl) {
      const packedMatches = htmlText.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\)/g);
      if (packedMatches) {
        console.log(`[RESOLVE][VOE] Found packed eval, attempting extraction...`);
        for (const packed of packedMatches) {
          // Extract potential base64 strings from packed code
          const b64Strings = packed.match(/"([A-Za-z0-9+/=]{40,})"/g) || [];
          for (const b64 of b64Strings) {
            try {
              const cleanedB64 = b64.replace(/"/g, '');
              const decoded = atob(cleanedB64 + '==='.slice(0, (4 - cleanedB64.length % 4) % 4));
              const urlMatch = decoded.match(/(https?:[^"']+?\.(?:mp4|m3u8)[^"']*)/);
              if (urlMatch && !isBaitSource(urlMatch[1])) {
                directUrl = urlMatch[1];
                console.log(`[RESOLVE][VOE] Found URL in packed eval: ${directUrl}`);
                break;
              }
            } catch {
              // Continue to next base64 string
            }
          }
          if (directUrl) break;
        }
      }
    }

    // Pattern 9: Look for iframe redirects
    if (!directUrl) {
      const iframeMatch = htmlText.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (iframeMatch) {
        let iframeSrc = iframeMatch[1];
        if (iframeSrc.startsWith('//')) {
          iframeSrc = 'https:' + iframeSrc;
        } else if (!iframeSrc.startsWith('http')) {
          const parsed = new URL(embedUrl);
          iframeSrc = `${parsed.protocol}//${parsed.host}${iframeSrc.startsWith('/') ? '' : '/'}${iframeSrc}`;
        }
        
        // Skip if already visited
        if (!visitedUrls.has(iframeSrc)) {
          console.log(`[RESOLVE][VOE] Found iframe, following to: ${iframeSrc}`);
          // Recursive call for iframe, passing visitedUrls
          return resolveVoeSource(iframeSrc, visitedUrls);
        }
      }
    }

    if (!directUrl) {
      console.log(`[RESOLVE][VOE] FAILED all patterns`);
      return { success: false, error: 'Could not extract direct URL from VOE.sx' };
    }

    // Validate the URL is not a bait
    if (isBaitSource(directUrl)) {
      console.log(`[RESOLVE][VOE] Detected bait source, rejecting`);
      return { success: false, error: 'Detected bait/test source' };
    }

    // Unescape HTML entities
    directUrl = directUrl.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

    // Cache the result
    cacheSet(embedUrl, directUrl);
    console.log(`[RESOLVE][VOE] SUCCESS: ${directUrl}`);

    return { success: true, direct_url: directUrl, cached: false };

  } catch (error) {
    console.error(`[RESOLVE][VOE] Error: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Resolve source URL based on hosting provider
 */
export async function resolveSource(
  url: string, 
  hosting: string
): Promise<ResolveResult> {
  const hostingLower = hosting.toLowerCase();

  // Check if it's a VOE domain (including mirrors)
  if (VOE_DOMAINS.some(domain => hostingLower.includes(domain)) || isVoeDomain(url)) {
    return resolveVoeSource(url);
  }

  // Add more hosting providers here as needed
  // For now, return the original URL for unsupported providers
  return {
    success: false,
    error: `Hosting provider "${hosting}" is not supported yet. Supported: voe.sx and mirrors`
  };
}

/**
 * Get proxy URL for streaming through our server
 * This helps avoid CORS issues
 */
export function getProxyStreamUrl(directUrl: string): string {
  return `/api/stream/proxy?url=${encodeURIComponent(directUrl)}`;
}

/**
 * Check if a hosting provider is supported
 */
export function isSupportedHosting(hosting: string): boolean {
  return VOE_DOMAINS.some(h => hosting.toLowerCase().includes(h));
}

export const streamingService = {
  resolveSource,
  resolveVoeSource,
  getProxyStreamUrl,
  isSupportedHosting,
  cacheGet,
  cacheSet,
};

export default streamingService;
