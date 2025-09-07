// Tor Exit Node Detection and Blocking
import { createHash } from 'crypto';

// In-memory Tor exit node cache with automatic updates
let torExitNodes = new Set();
let lastTorUpdate = 0;
const TOR_UPDATE_INTERVAL = 3600000; // 1 hour
const TOR_CACHE_TTL = 7200000; // 2 hours

// Fetch and cache Tor exit nodes
async function updateTorExitNodes() {
  const now = Date.now();
  
  if (now - lastTorUpdate < TOR_UPDATE_INTERVAL) {
    return; // Skip if recently updated
  }
  
  try {
    console.log('Updating Tor exit node list...');
    const response = await fetch('https://check.torproject.org/torbulkexitlist', {
      timeout: 10000,
      headers: {
        'User-Agent': 'minnebo-ai-security/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    const ips = text.split('\n')
      .map(ip => ip.trim())
      .filter(ip => ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip));
    
    // Atomic update
    const newTorNodes = new Set(ips);
    torExitNodes = newTorNodes;
    lastTorUpdate = now;
    
    console.log(`Updated Tor exit node list: ${ips.length} nodes`);
  } catch (error) {
    console.error('Failed to update Tor exit nodes:', error.message);
    // Keep using cached list if update fails
  }
}

// Initialize Tor list on startup
updateTorExitNodes();

// Set up automatic updates
setInterval(updateTorExitNodes, TOR_UPDATE_INTERVAL);

// Extract real IP from headers (handle proxy chains)
function extractRealIP(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  
  if (xForwardedFor) {
    // Take the leftmost IP (original client) and validate it
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    for (const ip of ips) {
      // Validate IP format and reject private/local ranges
      if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        const parts = ip.split('.').map(Number);
        
        // Reject private/reserved ranges
        if (parts[0] === 10) continue; // 10.0.0.0/8
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) continue; // 172.16.0.0/12
        if (parts[0] === 192 && parts[1] === 168) continue; // 192.168.0.0/16
        if (parts[0] === 127) continue; // 127.0.0.0/8
        if (parts[0] === 169 && parts[1] === 254) continue; // 169.254.0.0/16
        if (parts[0] >= 224) continue; // Multicast/reserved
        
        return ip;
      }
    }
  }
  
  // Fallback to direct connection IP
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown';
}

// Check if IP is a known Tor exit node
function isTorExitNode(ip) {
  if (!ip || ip === 'unknown') return false;
  
  // Ensure Tor list is fresh
  if (Date.now() - lastTorUpdate > TOR_CACHE_TTL) {
    updateTorExitNodes(); // Async update, use cached data for now
  }
  
  return torExitNodes.has(ip);
}

// Advanced request fingerprinting to detect Tor patterns
function generateRequestFingerprint(req) {
  const headers = req.headers;
  
  // Create deterministic fingerprint from request characteristics
  const fingerprintData = [
    headers['user-agent'] || '',
    headers['accept'] || '',
    headers['accept-language'] || '',
    headers['accept-encoding'] || '',
    headers['connection'] || '',
    Object.keys(headers).sort().join(','), // Header order
    req.method,
    req.url
  ].join('|');
  
  return createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
}

// Detect Tor browser patterns
function detectTorBrowser(req) {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const acceptLang = (req.headers['accept-language'] || '').toLowerCase();
  
  // Tor Browser specific patterns
  const torPatterns = [
    /mozilla\/5\.0 \(windows nt 10\.0; rv:\d+\.0\) gecko\/20100101 firefox\/\d+\.0$/,
    /mozilla\/5\.0 \(x11; linux x86_64; rv:\d+\.0\) gecko\/20100101 firefox\/\d+\.0$/,
    /mozilla\/5\.0 \(macintosh; intel mac os x 10\.15; rv:\d+\.0\) gecko\/20100101 firefox\/\d+\.0$/
  ];
  
  const isTorUA = torPatterns.some(pattern => pattern.test(userAgent));
  
  // Tor Browser typically sends en-US,en;q=0.5
  const isTorLang = acceptLang === 'en-us,en;q=0.5' || acceptLang === 'en-us,en;q=0.9';
  
  // Check for missing headers that browsers usually send
  const missingHeaders = !req.headers['sec-fetch-site'] && 
                        !req.headers['sec-fetch-mode'] && 
                        !req.headers['sec-ch-ua'];
  
  return {
    suspiciousUA: isTorUA,
    suspiciousLang: isTorLang,
    missingHeaders: missingHeaders,
    score: (isTorUA ? 3 : 0) + (isTorLang ? 2 : 0) + (missingHeaders ? 1 : 0)
  };
}

export { 
  isTorExitNode, 
  extractRealIP, 
  generateRequestFingerprint, 
  detectTorBrowser,
  updateTorExitNodes 
};