// Cron nhắc việc hằng ngày. Vercel Cron gọi GET /api/remind (xem vercel.json) và tự gửi
// "Authorization: Bearer $CRON_SECRET". Dịch vụ cron ngoài cũng gọi được với cùng header.
const crypto = require('crypto');
const { gas, env } = require('./_gas');
const push = require('./_push');

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
function same(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' });
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return send(res, 500, { ok: false, error: 'not_configured' });
  const auth = String((req.headers || {}).authorization || '');
  if (!same(auth, 'Bearer ' + secret)) return send(res, 401, { ok: false, error: 'unauthorized' });
  const e = env();
  if (!e.url || !e.token) return send(res, 500, { ok: false, error: 'not_configured' });
  try {
    const r = await push.runReminder(gas);
    return send(res, r.error ? 500 : 200, Object.assign({ ok: !r.error }, r));
  } catch (err) {
    return send(res, 502, { ok: false, error: 'upstream_error' });
  }
}

module.exports = handler;
