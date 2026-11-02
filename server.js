// Deploy timestamp: 2026-11-02 06:49
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createStore } = require('./store');

const store = createStore();

const PORT = process.env.PORT || 5000;
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.md': 'text/markdown; charset=utf-8'
};

// ظ…ظ„ظپط§طھ ظˆظ…ط¬ظ„ط¯ط§طھ ظ…ط­ط¸ظˆط±ط© - ظ„ط§ ظٹط¬ط¨ ظƒط´ظپظ‡ط§ ظ„ظ„ظ…طھطµظپط­
const BLOCKED_PATTERNS = [
    /^\.git(\/|\\|$)/,
    /^node_modules(\/|\\|$)/,
    /^\.env/,
    /package-lock\.json$/,
    /tunnel_url\.txt$/,
    /push_.*\.json$/,
    /temp_.*\.json$/
];

const MAX_DB_BYTES = 2 * 1024 * 1024; // 2MB
const WRITE_WINDOW_MS = 60 * 1000;
const MAX_WRITES_PER_WINDOW = 30;
const writeLog = new Map();

// ط¹ظ†ظˆط§ظ† ط§ظ„ط²ط§ط¦ط±: ظ„ط§ ظ†ط«ظ‚ ط¨طھط±ظˆظٹط³ط© X-Forwarded-For ط¥ظ„ط§ ط®ظ„ظپ ط¨ط±ظˆظƒط³ظٹ ظ…ط¹ط±ظˆظپ (ظ…ط«ظ„ Render)
// TRUST_PROXY = ط¹ط¯ط¯ ط§ظ„ط¨ط±ظˆظƒط³ظٹط§طھ ط§ظ„ظ…ظˆط«ظˆظ‚ط© ط£ظ…ط§ظ… ط§ظ„ط®ط§ط¯ظ… (0 ط§ظپطھط±ط§ط¶ظٹط§ظ‹)
const TRUST_PROXY = Math.max(0, parseInt(process.env.TRUST_PROXY || '0', 10) || 0);
function clientIp(req) {
    if (TRUST_PROXY > 0) {
        const chain = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean);
        if (chain.length >= TRUST_PROXY) return chain[chain.length - TRUST_PROXY];
    }
    return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(req) {
    const ip = clientIp(req);
    const now = Date.now();
    const recent = (writeLog.get(ip) || []).filter(t => now - t < WRITE_WINDOW_MS);
    recent.push(now);
    writeLog.set(ip, recent);
    if (writeLog.size > 5000) writeLog.clear();
    return recent.length > MAX_WRITES_PER_WINDOW;
}

function isPathBlocked(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\//, '');
    return BLOCKED_PATTERNS.some(rx => rx.test(normalized));
}

const server = http.createServer(async (req, res) => {
    // Security headers - طھط·ط¨ظ‚ ط¹ظ„ظ‰ ظƒظ„ ط§ظ„ط±ط¯ظˆط¯
    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '0', // ظ†ط¹طھظ…ط¯ ط¹ظ„ظ‰ CSP ط¨ط¯ظ„ط§ظ‹ ظ…ظ†ظ‡
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        // CSP ظٹط³ظ…ط­ ط¨ط§ظ„ظ€ inline ط§ظ„ط­ط§ظ„ظٹ ظ…ط¹ ط§ظ„طھظ…ظ‡ظٹط¯ ظ„ظ†ظ‚ظ„ظ‡ ظ„ط§ط­ظ‚ط§ظ‹ ظ„ظ€ nonce
        'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://fonts.googleapis.com 'unsafe-inline'; style-src 'self' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self' https://wa.me https://api.whatsapp.com",
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin'
    };

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            ...securityHeaders,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }

    const apiUrl = req.url.split('?')[0];
    if (apiUrl.startsWith('/api/')) {
        await handleApi(req, res, apiUrl, securityHeaders);
        return;
    }

    // ظپظ‚ط· GET/HEAD ظ…ط³ظ…ظˆط­ ظ„ظ„ظ…ظ„ظپط§طھ ط§ظ„ط«ط§ط¨طھط©
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Allow': 'GET, HEAD, OPTIONS' });
        res.end('405 Method Not Allowed');
        return;
    }

    let reqUrl;
    try {
        reqUrl = decodeURI(req.url.split('?')[0]);
    } catch (e) {
        res.writeHead(400, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('400 Bad Request');
        return;
    }

    if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

    // ظ…ظ†ط¹ Path Traversal: ط­ظ„ ط§ظ„ظ…ط³ط§ط± ظˆطھط£ظƒط¯ ط£ظ†ظ‡ ط¯ط§ط®ظ„ __dirname
    const safeJoined = path.join(__dirname, reqUrl);
    const resolved = path.resolve(safeJoined);
    const rootResolved = path.resolve(__dirname);

    if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
        res.writeHead(403, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    const relative = path.relative(__dirname, resolved);
    // ط­ط¬ط¨ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ط­ط³ط§ط³ط©
    if (isPathBlocked(relative)) {
        res.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
    }

    // ظ…ظ†ط¹ ظƒط´ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط®ظپظٹط© (dotfiles)
    if (relative.split(/[\\/]/).some(part => part.startsWith('.')) || ['server.js', 'store.js'].includes(relative)) {
        res.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
    }

    let filePath = resolved;

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }
        
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        const isAdminPage = path.basename(filePath).toLowerCase() === 'admin.html';
        const headers = {
            ...securityHeaders,
            'Content-Type': contentType,
            'Cache-Control': isAdminPage ? 'no-store, no-cache, must-revalidate, private' : (['.html', '.js', '.css', '.json'].includes(ext) ? 'no-cache, must-revalidate' : 'public, max-age=86400'),
            'X-Content-Type-Options': 'nosniff',
            ...(isAdminPage ? { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } : {})
        };
        // CORS ظ…ط­ط¯ظˆط¯ - ظپظ‚ط· ظ„ظ„طµظˆط±/ط§ظ„ط®ط·ظˆط· ط¥ط°ط§ ظ„ط²ظ…
        // ظ„ط§ ظ†ظپطھط­ Access-Control-Allow-Origin: * ظ„ظƒظ„ ط´ظٹط،
        if (['.png','.jpg','.jpeg','.webp','.svg','.woff','.woff2'].includes(ext)) {
            headers['Access-Control-Allow-Origin'] = '*';
        }
        
        res.writeHead(200, headers);
        
        if (req.method === 'HEAD') {
            res.end();
            return;
        }
        fs.createReadStream(filePath).pipe(res);
    });
});

function sendJSON(res, status, headers, payload) {
    res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
}

async function readJSONBody(req, maxBytes) {
    let body = '';
    for await (const chunk of req) {
        body += chunk;
        if (body.length > maxBytes) { req.destroy(); const e = new Error('Payload too large'); e.status = 413; throw e; }
    }
    try { return JSON.parse(body || '{}'); } catch (e) { const err = new Error('Invalid JSON'); err.status = 400; throw err; }
}


async function handleApi(req, res, url, headers) {
    try {
        const m = req.method;
        // ----- public -----
        if (url === '/api/health' && m === 'GET') return sendJSON(res, 200, headers, { ok: true });
        if (url === '/api/catalog' && m === 'GET') return sendJSON(res, 200, headers, store.publicCatalog());
        if (url === '/api/orders' && m === 'POST') {
            const r = store.createOrder(await readJSONBody(req, 4 * 1024 * 1024), clientIp(req));
            return sendJSON(res, r.status, headers, r.error ? { error: r.error } : r.order);
        }
        if (url === '/api/orders/status' && m === 'POST') {
            const r = store.orderStatus(await readJSONBody(req, 16 * 1024), clientIp(req));
            return sendJSON(res, r.status, headers, r.error ? { error: r.error } : { orders: r.orders, missing: r.missing || [] });
        }
        if (url === '/api/admin/login' && m === 'POST') {
            if (isRateLimited(req)) return sendJSON(res, 429, headers, { error: 'ظ…ط­ط§ظˆظ„ط§طھ ظƒط«ظٹط±ط©طŒ ط­ط§ظˆظ„ ط¨ط¹ط¯ ط¯ظ‚ظٹظ‚ط©' });
            const body = await readJSONBody(req, 4 * 1024);
            const token = store.adminLogin(body.pin);
            return token ? sendJSON(res, 200, headers, { token }) : sendJSON(res, 401, headers, { error: 'ظƒظ„ظ…ط© ط§ظ„ط³ط± ط؛ظٹط± طµط­ظٹط­ط©' });
        }

        // ----- admin only -----
        if (!store.isAdmin(req)) return sendJSON(res, 401, headers, { error: 'Unauthorized' });
        if (url === '/api/admin/logout' && m === 'POST') { store.adminLogout(req); return sendJSON(res, 200, headers, { ok: true }); }
        if (url === '/api/database' && m === 'GET') return sendJSON(res, 200, headers, store.adminDatabase());
        if (url === '/api/database' && m === 'POST') {
            if (isRateLimited(req)) return sendJSON(res, 429, headers, { error: 'Too many requests' });
            store.mergeAdminDatabase(await readJSONBody(req, MAX_DB_BYTES));
            return sendJSON(res, 200, headers, { success: true });
        }
        if (url === '/api/admin/status' && m === 'GET') return sendJSON(res, 200, headers, store.storageInfo());
        if (url === '/api/admin/orders/confirm' && m === 'POST') {
            return sendJSON(res, 200, headers, { order: store.adminConfirmOrder(await readJSONBody(req, 16 * 1024)) });
        }
        if (url === '/api/admin/orders/cancel' && m === 'POST') {
            return sendJSON(res, 200, headers, { order: store.adminCancelOrder(await readJSONBody(req, 4 * 1024)) });
        }
        if (url === '/api/catalog' && m === 'PUT') {
            store.saveCatalog(await readJSONBody(req, MAX_DB_BYTES));
            return sendJSON(res, 200, headers, { success: true });
        }
        return sendJSON(res, 404, headers, { error: 'Not found' });
    } catch (e) {
        return sendJSON(res, e.status || 400, headers, { error: e.message || 'Bad request' });
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT} [secured]`);
});

