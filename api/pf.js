// Proxy giữa trình duyệt và Google Apps Script.
// URL + mã chung (TOKEN) chỉ nằm ở biến môi trường Vercel, không bao giờ gửi xuống trình duyệt.
const crypto = require('crypto');
const { env, gas } = require('./_gas');
const push = require('./_push');

// Chạy việc nền sau khi đã trả lời (Vercel cần waitUntil); chạy máy dev thì tiến trình vẫn sống nên không cần.
let waitUntil = null;
try { waitUntil = require('@vercel/functions').waitUntil; } catch (e) { /* không có thì bỏ qua */ }
function background(promise) {
  const p = Promise.resolve(promise).catch(function () { /* lỗi gửi thông báo không được làm hỏng thao tác chính */ });
  if (waitUntil) { try { waitUntil(p); } catch (e) { /* ngoài môi trường Vercel */ } }
}

const SESSION_DAYS = 30;
const ALLOWED_CFG = ['app_name', 'household_name', 'slogan', 'primary_color', 'monthly_budget'];

/* ---------- session ký HMAC ---------- */
function key(token) { return crypto.createHash('sha256').update('pf-session|' + token).digest(); }
function b64(buf) { return Buffer.from(buf).toString('base64url'); }
function sign(token, user, now) {
  const payload = b64(JSON.stringify({ u: user, exp: (now || Date.now()) + SESSION_DAYS * 864e5 }));
  const mac = b64(crypto.createHmac('sha256', key(token)).update(payload).digest());
  return payload + '.' + mac;
}
function verify(token, session, now) {
  if (typeof session !== 'string') return null;
  const parts = session.split('.');
  if (parts.length !== 2) return null;
  const want = crypto.createHmac('sha256', key(token)).update(parts[0]).digest();
  let got;
  try { got = Buffer.from(parts[1], 'base64url'); } catch (e) { return null; }
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!p.u || !(p.exp > (now || Date.now()))) return null;
    return String(p.u);
  } catch (e) { return null; }
}

/* ---------- users trong Sheet: "hiendc:1998,trangdt:1999" ---------- */
function parseUsers(str) {
  const out = [];
  String(str || '').split(',').forEach(function (part) {
    const i = part.indexOf(':');
    if (i < 1) return;
    const name = part.slice(0, i).trim(), pass = part.slice(i + 1).trim();
    if (name && pass) out.push({ name: name, pass: pass });
  });
  return out;
}
function same(a, b) { // so sánh hằng thời gian
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
// Không bao giờ trả mật khẩu cho trình duyệt: chỉ còn danh sách tên.
function publicConfig(cfg) {
  const out = Object.assign({}, cfg || {});
  out.users = parseUsers(out.users).map(function (u) { return u.name; }).join(',');
  return out;
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' });
  const e = env();
  if (!e.url || !e.token) return send(res, 500, { ok: false, error: 'not_configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (err) { b = null; } }
  if (!b || typeof b !== 'object') return send(res, 400, { ok: false, error: 'bad_request' });

  try {
    if (b.action === 'login') {
      const d = await gas({ action: 'list' });
      if (!d.ok) return send(res, 502, { ok: false, error: 'upstream_error' });
      const users = parseUsers((d.config || {}).users);
      const u = String(b.username || '').trim(), p = String(b.password || '');
      let found = null;
      users.forEach(function (x) { if (same(x.name, u) && same(x.pass, p)) found = x; }); // duyệt hết, không thoát sớm
      if (!found) { await sleep(400); return send(res, 401, { ok: false, error: 'bad_credentials' }); }
      return send(res, 200, { ok: true, session: sign(e.token, found.name), username: found.name });
    }

    const auth = String(req.headers.authorization || '');
    const user = verify(e.token, auth.indexOf('Bearer ') === 0 ? auth.slice(7) : '');
    if (!user) return send(res, 401, { ok: false, error: 'unauthorized' });

    if (b.action === 'list') {
      const d = await gas({ action: 'list' });
      if (!d.ok) return send(res, 502, { ok: false, error: 'upstream_error' });
      return send(res, 200, { ok: true, username: user, config: publicConfig(d.config), items: d.items || [] });
    }
    if (b.action === 'add') {
      const d = await gas({ action: 'add', username: user, content: b.content, amount: b.amount, created_at: b.created_at });
      if (d.ok && d.item) background(push.notifySpend(gas, user, d.item)); // báo cho người khác trong nhà
      return send(res, d.ok ? 200 : 400, d);
    }
    if (b.action === 'update') {
      const l = await gas({ action: 'list' });
      if (!l.ok) return send(res, 502, { ok: false, error: 'upstream_error' });
      const it = (l.items || []).filter(function (x) { return String(x.id) === String(b.id); })[0];
      if (!it) return send(res, 404, { ok: false, error: 'not_found' });
      if (it.username !== user) return send(res, 403, { ok: false, error: 'forbidden' });
      const d = await gas({ action: 'update', id: b.id, content: b.content, amount: b.amount, created_at: b.created_at });
      return send(res, d.ok ? 200 : 400, d);
    }
    if (b.action === 'delete') {
      const d = await gas({ action: 'list' });
      if (!d.ok) return send(res, 502, { ok: false, error: 'upstream_error' });
      const it = (d.items || []).filter(function (x) { return String(x.id) === String(b.id); })[0];
      if (!it) return send(res, 404, { ok: false, error: 'not_found' });
      if (it.username !== user) return send(res, 403, { ok: false, error: 'forbidden' });
      const r = await gas({ action: 'delete', id: b.id });
      return send(res, r.ok ? 200 : 400, r);
    }
    if (b.action === 'setconfig') {
      const values = {};
      ALLOWED_CFG.forEach(function (k) { if (b.values && Object.prototype.hasOwnProperty.call(b.values, k)) values[k] = b.values[k]; });
      const d = await gas({ action: 'setconfig', values: values });
      if (d.ok) d.config = publicConfig(d.config);
      return send(res, d.ok ? 200 : 400, d);
    }
    // Check-list hằng ngày: username luôn lấy từ session, không nhận từ trình duyệt.
    if (b.action === 'habit_list') {
      const d = await gas({ action: 'habit_list', username: user, since: b.since });
      return send(res, d.ok ? 200 : 400, d);
    }
    if (b.action === 'habit_save') {
      const d = await gas({ action: 'habit_save', username: user, id: b.id, name: b.name, emoji: b.emoji, days: b.days });
      return send(res, d.ok ? 200 : 400, d);
    }
    if (b.action === 'habit_delete') {
      const d = await gas({ action: 'habit_delete', username: user, id: b.id });
      return send(res, d.ok ? 200 : 400, d);
    }
    if (b.action === 'habit_check') {
      const d = await gas({ action: 'habit_check', username: user, habit_id: b.habit_id, date: b.date, done: !!b.done });
      return send(res, d.ok ? 200 : 400, d);
    }
    // Thông báo đẩy (chỉ thiết bị di động): luôn gắn với user trong session
    if (b.action === 'push_key') {
      if (!push.configured()) return send(res, 500, { ok: false, error: 'push_not_configured' });
      return send(res, 200, { ok: true, key: push.config().pub });
    }
    if (b.action === 'push_subscribe') {
      const sub = b.subscription || {}, keys = sub.keys || {};
      if (b.mobile !== true || !sub.endpoint || !keys.p256dh || !keys.auth) return send(res, 400, { ok: false, error: 'invalid' });
      const d = await gas({ action: 'push_save', username: user, endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth, spend: !!b.spend, habit: !!b.habit });
      return send(res, d.ok ? 200 : 400, d);
    }
    if (b.action === 'push_unsubscribe') {
      const d = await gas({ action: 'push_remove', username: user, endpoint: String(b.endpoint || '') });
      return send(res, 200, { ok: true, removed: !!d.ok });
    }
    if (b.action === 'push_get') {
      const d = await gas({ action: 'push_get', username: user, endpoint: String(b.endpoint || '') });
      return send(res, d.ok ? 200 : 404, d);
    }
    if (b.action === 'push_test') {
      const d = await push.sendTest(gas, user, b.kind === 'spend' || b.kind === 'habit' ? b.kind : 'basic');
      return send(res, d.ok ? 200 : (d.error === 'not_found' ? 404 : 400), d);
    }
    return send(res, 400, { ok: false, error: 'unknown_action' });
  } catch (err) {
    return send(res, 502, { ok: false, error: 'upstream_error' });
  }
}

module.exports = handler;
module.exports._test = { sign: sign, verify: verify, parseUsers: parseUsers, publicConfig: publicConfig };
