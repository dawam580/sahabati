const http = require('http');
const fs = require('fs');
const path = require('path');
// وحدة الطلبات اختيارية: إذا لم يكن الملف موجوداً يعمل الخادم بدونها بدلاً من التوقف
let handleOrders = async () => false;
try {
    ({ handleOrders } = require('./order-api'));
} catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
    console.warn('order-api.js غير موجود - تم تعطيل /api/orders');
}

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

// ملفات ومجلدات محظورة - لا يجب كشفها للمتصفح
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

function isRateLimited(req) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
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
    // Security headers - تطبق على كل الردود
    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '0', // نعتمد على CSP بدلاً منه
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        // CSP يسمح بالـ inline الحالي مع التمهيد لنقله لاحقاً لـ nonce
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
    if (apiUrl === '/api/database') {
        const dbDir = path.join(__dirname, '.data');
        const dbFile = path.join(dbDir, 'database.json');
        if (req.method === 'GET') {
            try {
                const data = await fs.promises.readFile(dbFile, 'utf8');
                res.writeHead(200, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                res.end(data);
            } catch(e) {
                res.writeHead(200, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                res.end('{}');
            }
            return;
        } else if (req.method === 'POST') {
            // حماية من الإغراق: حد للحجم ولعدد مرات الكتابة لكل عنوان IP
            if (isRateLimited(req)) {
                res.writeHead(429, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': '60' });
                res.end(JSON.stringify({ error: 'Too many requests' }));
                return;
            }
            let body = '';
            let tooLarge = false;
            for await (const chunk of req) {
                body += chunk;
                if (body.length > MAX_DB_BYTES) { tooLarge = true; break; }
            }
            if (tooLarge) {
                res.writeHead(413, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Payload too large' }));
                req.destroy();
                return;
            }
            try {
                const parsed = JSON.parse(body);
                if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.orders) || !Array.isArray(parsed.users) || !Array.isArray(parsed.voucher_codes)) {
                    throw new Error('missing collections');
                }
                await fs.promises.mkdir(dbDir, { recursive: true });
                await fs.promises.writeFile(dbFile, body, 'utf8');
                res.writeHead(200, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                res.end(JSON.stringify({ success: true }));
            } catch(e) {
                res.writeHead(400, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                res.end(JSON.stringify({ error: 'Invalid database payload: ' + e.message }));
            }
            return;
        }
    }
    if (await handleOrders(req, res, securityHeaders, apiUrl)) return;

    // فقط GET/HEAD مسموح للملفات الثابتة
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

    // منع Path Traversal: حل المسار وتأكد أنه داخل __dirname
    const safeJoined = path.join(__dirname, reqUrl);
    const resolved = path.resolve(safeJoined);
    const rootResolved = path.resolve(__dirname);

    if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
        res.writeHead(403, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    const relative = path.relative(__dirname, resolved);
    // حجب الملفات الحساسة
    if (isPathBlocked(relative)) {
        res.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
    }

    // منع كشف الملفات المخفية (dotfiles)
    if (relative.split(/[\\/]/).some(part => part.startsWith('.')) || ['server.js', 'order-api.js'].includes(relative)) {
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
        // CORS محدود - فقط للصور/الخطوط إذا لزم
        // لا نفتح Access-Control-Allow-Origin: * لكل شيء
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

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT} [secured]`);
});
