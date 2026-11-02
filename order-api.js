const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const MAX_IMAGE = 5 * 1024 * 1024;
const ORDER_DIR = path.resolve(process.env.ORDER_STORAGE_DIR || path.join(__dirname, '.orders'));
function imageType(buffer) {
    if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return ['jpg', 'image/jpeg'];
    if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ['png', 'image/png'];
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return ['webp', 'image/webp'];
    return null;
}
async function handleOrders(req, res, headers, url) {
    const reply = (status, data) => {
        res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(data));
    };
    if (url === '/api/orders') {
        if (req.method !== 'POST') { reply(405, { error: 'Method not allowed' }); return true; }
        let size = 0;
        const chunks = [];
        try {
            if (!(req.headers['content-type'] || '').startsWith('application/json')) { reply(415, { error: 'Invalid content type' }); return true; }
            for await (const chunk of req) {
                size += chunk.length;
                if (size > MAX_IMAGE * 1.4 + 65536) { reply(413, { error: 'الصورة كبيرة جداً. الحد الأقصى 5 ميجابايت.' }); return true; }
                chunks.push(chunk);
            }
            const body = JSON.parse(Buffer.concat(chunks).toString());
            if (typeof body.phone !== 'string' || !/^0?9\d{8}$/.test(body.phone) ||
                !Array.isArray(body.items) || !body.items.length || body.items.length > 100 ||
                body.items.some(item => typeof item.titleAr !== 'string' || !item.titleAr.trim() || item.titleAr.length > 300 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999) ||
                (body.name != null && (typeof body.name !== 'string' || body.name.length > 80))) {
                reply(400, { error: 'تحقق من رقم الهاتف والمنتجات المختارة.' }); return true;
            }
            const match = typeof body.proof === 'string' && body.proof.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
            if (!match) { reply(400, { error: 'اختر صورة إثبات الدفع بصيغة JPG أو PNG أو WebP.' }); return true; }
            const proof = Buffer.from(match[1], 'base64');
            const type = imageType(proof);
            if (!type || !proof.length || proof.length > MAX_IMAGE) { reply(400, { error: 'صورة غير صالحة أو أكبر من 5 ميجابايت.' }); return true; }
            const id = randomUUID();
            const createdAt = new Date().toISOString();
            const orderPath = path.join(ORDER_DIR, id);
            await fs.mkdir(orderPath, { recursive: true });
            try {
                await fs.writeFile(path.join(orderPath, 'proof.' + type[0]), proof, { flag: 'wx' });
                await fs.writeFile(path.join(orderPath, 'order.json'), JSON.stringify({ id, createdAt, name: body.name || '', phone: body.phone, items: body.items.map(item => ({ titleAr: item.titleAr, quantity: item.quantity })), paymentMethod: body.paymentMethod, proofType: type }), { flag: 'wx' });
            } catch (error) {
                await fs.rm(orderPath, { recursive: true, force: true });
                throw error;
            }
            reply(201, { id, createdAt, proofPath: '/payment-proof/' + id });
        } catch (error) {
            reply(error instanceof SyntaxError ? 400 : 500, { error: 'تعذر حفظ الطلب. حاول مجدداً؛ ستبقى السلة والصورة محفوظتين في هذه الصفحة.' });
        }
        return true;
    }
    const match = url.match(/^\/payment-proof\/([a-f0-9-]{36})$/);
    if (!match) return false;
    if (!['GET', 'HEAD'].includes(req.method)) { reply(405, { error: 'Method not allowed' }); return true; }
    try {
        const orderPath = path.join(ORDER_DIR, match[1]);
        const order = JSON.parse(await fs.readFile(path.join(orderPath, 'order.json'), 'utf8'));
        const proof = await fs.readFile(path.join(orderPath, 'proof.' + order.proofType[0]));
        res.writeHead(200, { ...headers, 'Content-Type': order.proofType[1], 'Content-Length': proof.length, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' });
        res.end(req.method === 'HEAD' ? undefined : proof);
    } catch { reply(404, { error: 'الإثبات غير موجود.' }); }
    return true;
}
module.exports = { handleOrders };
