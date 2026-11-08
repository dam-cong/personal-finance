// Thông báo đẩy (Web Push). Chỉ chạy ở server; khoá VAPID bí mật nằm ở biến môi trường.
// Hàm nhận `gas` làm tham số để test được mà không cần mạng.
const PH = require('../habits');

let webpush = null;
let inited = false;

function config() {
  return {
    pub: process.env.VAPID_PUBLIC_KEY || '',
    priv: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || '',
  };
}
function configured() {
  const c = config();
  return !!(c.pub && c.priv && c.subject);
}

// Gửi thật qua web-push; trả 'ok' | 'gone' (đăng ký đã chết, nên xoá) | 'error'.
async function realSender(sub, payload) {
  if (!webpush) webpush = require('web-push');
  if (!inited) {
    const c = config();
    webpush.setVapidDetails(c.subject, c.pub, c.priv);
    inited = true;
  }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 6 * 3600, urgency: 'normal', timeout: 8000 }
    );
    return 'ok';
  } catch (e) {
    return e && (e.statusCode === 404 || e.statusCode === 410) ? 'gone' : 'error';
  }
}
let sender = realSender;
function setSender(fn) { sender = fn || realSender; }

function money(v) { return Number(v).toLocaleString('vi-VN') + 'đ'; }
function todayVN(now) { return new Date((now == null ? Date.now() : now) + 7 * 3600e3).toISOString().slice(0, 10); }

// Gửi tới danh sách đăng ký, tự xoá những đăng ký đã chết. Trả về { sent, removed }.
async function deliver(gas, subs, payload, onOk) {
  let sent = 0, removed = 0;
  await Promise.all(subs.map(async function (s) {
    const r = await sender(s, payload);
    if (r === 'ok') { sent++; if (onOk) await onOk(s); }
    else if (r === 'gone') { removed++; try { await gas({ action: 'push_remove', endpoint: s.endpoint }); } catch (e) { /* bỏ qua */ } }
  }));
  return { sent: sent, removed: removed };
}

// Có khoản chi mới: báo cho người KHÁC trong nhà (đã bật "khoản chi mới").
async function notifySpend(gas, author, item) {
  if (!configured()) return { sent: 0, removed: 0 };
  const d = await gas({ action: 'push_list' });
  if (!d || !d.ok) return { sent: 0, removed: 0 };
  const targets = (d.subs || []).filter(function (s) { return s.spend && s.username !== author; });
  if (!targets.length) return { sent: 0, removed: 0 };
  return deliver(gas, targets, {
    title: author + ' vừa chi ' + money(item.amount),
    body: String(item.content || ''),
    url: '/?go=chat',
    tag: 'spend-' + item.id,
  });
}

// Nhắc việc hằng ngày: mỗi người còn việc chưa tích hôm nay thì nhắc đúng một lần/ngày.
async function runReminder(gas, now) {
  const out = { sent: 0, removed: 0, users: 0 };
  if (!configured()) return Object.assign(out, { error: 'push_not_configured' });
  const today = todayVN(now);
  const pair = await Promise.all([gas({ action: 'push_list' }), gas({ action: 'habit_all', since: PH.addDays(today, -3) })]);
  const l = pair[0], a = pair[1];
  if (!l || !l.ok || !a || !a.ok) return Object.assign(out, { error: 'upstream_error' });

  const habitsBy = {}, logsBy = {};
  (a.habits || []).forEach(function (h) { (habitsBy[h.username] = habitsBy[h.username] || []).push(h); });
  (a.logs || []).forEach(function (g) { (logsBy[g.username] = logsBy[g.username] || []).push(g); });

  const byUser = {};
  (l.subs || []).forEach(function (s) {
    if (s.habit && s.last_habit_date !== today) (byUser[s.username] = byUser[s.username] || []).push(s);
  });

  for (const user of Object.keys(byUser)) {
    const habits = habitsBy[user] || [];
    const done = PH.doneMap(logsBy[user] || []);
    const pending = habits.filter(function (h) { return PH.appliesOn(h, today) && !done[PH.key(today, h.id)]; });
    if (!pending.length) continue;
    out.users++;
    const names = pending.slice(0, 3).map(function (h) { return h.name; }).join(', ') + (pending.length > 3 ? '…' : '');
    const r = await deliver(gas, byUser[user], {
      title: 'Nhắc việc hằng ngày',
      body: 'Hôm nay còn ' + pending.length + ' việc chưa xong: ' + names,
      url: '/?go=habit',
      tag: 'habit-' + today,
    }, function (s) { return gas({ action: 'push_mark', endpoint: s.endpoint, date: today }); });
    out.sent += r.sent; out.removed += r.removed;
  }
  return out;
}

// Gửi thử tới các thiết bị của chính người dùng.
async function sendTest(gas, user) {
  if (!configured()) return { ok: false, error: 'push_not_configured' };
  const d = await gas({ action: 'push_list' });
  if (!d || !d.ok) return { ok: false, error: 'upstream_error' };
  const mine = (d.subs || []).filter(function (s) { return s.username === user; });
  if (!mine.length) return { ok: false, error: 'not_found' };
  const r = await deliver(gas, mine, { title: 'FamFin', body: 'Thông báo đã hoạt động 🎉', url: '/', tag: 'test' });
  return { ok: true, sent: r.sent };
}

module.exports = { configured, config, notifySpend, runReminder, sendTest, setSender, todayVN };
