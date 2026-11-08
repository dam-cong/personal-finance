const test = require('node:test');
const assert = require('node:assert');

process.env.VAPID_PUBLIC_KEY = 'BPublicKeyForTest';
process.env.VAPID_PRIVATE_KEY = 'private-for-test';
process.env.VAPID_SUBJECT = 'mailto:test@example.com';
process.env.CRON_SECRET = 'cron-secret-test';
process.env.APPS_SCRIPT_URL = 'https://example.test/exec';
process.env.APPS_TOKEN = 'token-test-123';

const push = require('../api/_push');
const remind = require('../api/remind');
const pf = require('../api/pf');

// 2026-11-05 là Thứ Năm (VN). now = 20:00 giờ VN.
const NOW = Date.parse('2026-11-05T20:00:00+07:00');
const TODAY = '2026-11-05';

function fakeGas(state) {
  state.calls = [];
  return async (p) => {
    state.calls.push(p);
    if (p.action === 'push_list') return { ok: true, subs: state.subs };
    if (p.action === 'habit_all') return { ok: true, habits: state.habits, logs: state.logs };
    if (p.action === 'push_mark') { state.subs.find((s) => s.endpoint === p.endpoint).last_habit_date = p.date; return { ok: true }; }
    if (p.action === 'push_remove') { state.subs = state.subs.filter((s) => s.endpoint !== p.endpoint); return { ok: true }; }
    return { ok: false, error: 'unknown_action' };
  };
}
const sub = (user, ep, o) => Object.assign({ username: user, endpoint: ep, p256dh: 'k', auth: 'a', spend: true, habit: true, last_habit_date: '' }, o || {});

test('notifySpend: không gửi cho người ghi, tôn trọng công tắc spend', async () => {
  const sent = [];
  push.setSender(async (s, payload) => { sent.push([s.endpoint, payload]); return 'ok'; });
  const st = { subs: [sub('hiendc', 'e1'), sub('trangdt', 'e2'), sub('trangdt', 'e3', { spend: false })] };
  const r = await push.notifySpend(fakeGas(st), 'hiendc', { id: 9, content: 'Cafe', amount: 45000 });
  assert.strictEqual(r.sent, 1);
  assert.deepStrictEqual(sent.map((x) => x[0]), ['e2']);
  assert.match(sent[0][1].title, /hiendc vừa chi 45\.000đ/);
  assert.strictEqual(sent[0][1].url, '/?go=chat');
});

test('notifySpend: đăng ký đã chết (gone) bị xoá', async () => {
  push.setSender(async () => 'gone');
  const st = { subs: [sub('trangdt', 'chet')] };
  const r = await push.notifySpend(fakeGas(st), 'hiendc', { id: 1, content: 'x', amount: 1000 });
  assert.strictEqual(r.removed, 1);
  assert.strictEqual(st.subs.length, 0);
});

test('notifySpend: không cấu hình VAPID thì không làm gì', async () => {
  const keep = process.env.VAPID_PRIVATE_KEY; delete process.env.VAPID_PRIVATE_KEY;
  push.setSender(async () => { throw new Error('không được gọi'); });
  const st = { subs: [sub('trangdt', 'e2')] };
  const r = await push.notifySpend(fakeGas(st), 'hiendc', { id: 1, content: 'x', amount: 1 });
  assert.strictEqual(r.sent, 0);
  assert.strictEqual(st.calls.length, 0);
  process.env.VAPID_PRIVATE_KEY = keep;
});

function habitState() {
  return {
    subs: [sub('hiendc', 'h1'), sub('trangdt', 't1')],
    habits: [
      { id: 1, username: 'hiendc', name: 'Đọc sách', days: '1,2,3,4,5,6,7', created_date: '2026-11-01', ended_date: '' },
      { id: 2, username: 'hiendc', name: 'Thiền', days: '1,2,3,4,5,6,7', created_date: '2026-11-01', ended_date: '' },
      { id: 3, username: 'trangdt', name: 'Chạy bộ', days: '1,2,3,4,5,6,7', created_date: '2026-11-01', ended_date: '' },
    ],
    logs: [{ date: TODAY, habit_id: 3, username: 'trangdt' }, { date: TODAY, habit_id: 1, username: 'hiendc' }],
  };
}

test('runReminder: chỉ nhắc người còn việc chưa tích, kèm tên việc', async () => {
  const sent = [];
  push.setSender(async (s, payload) => { sent.push([s.username, payload]); return 'ok'; });
  const st = habitState();
  const r = await push.runReminder(fakeGas(st), NOW);
  assert.deepStrictEqual(sent.map((x) => x[0]), ['hiendc']); // trangdt đã xong hết
  assert.match(sent[0][1].body, /còn 1 việc chưa xong: Thiền/);
  assert.strictEqual(sent[0][1].url, '/?go=habit');
  assert.strictEqual(r.sent, 1);
});

test('runReminder: mỗi ngày chỉ nhắc một lần (gọi hai lần)', async () => {
  let n = 0;
  push.setSender(async () => { n++; return 'ok'; });
  const st = habitState();
  const gas = fakeGas(st);
  await push.runReminder(gas, NOW);
  await push.runReminder(gas, NOW + 60000);
  assert.strictEqual(n, 1);
  assert.strictEqual(st.subs.find((s) => s.endpoint === 'h1').last_habit_date, TODAY);
});

test('runReminder: tôn trọng công tắc habit và việc đã kết thúc', async () => {
  let n = 0;
  push.setSender(async () => { n++; return 'ok'; });
  const st = habitState();
  st.subs[0].habit = false;
  await push.runReminder(fakeGas(st), NOW);
  assert.strictEqual(n, 0);
  const st2 = habitState();
  st2.habits[1].ended_date = TODAY; // Thiền đã kết thúc hôm nay -> không còn việc
  await push.runReminder(fakeGas(st2), NOW);
  assert.strictEqual(n, 0);
});

function callHandler(h, req) {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(s) { resolve({ status: this.statusCode, body: JSON.parse(s) }); } };
    h(req, res);
  });
}

test('/api/remind: thiếu hoặc sai CRON_SECRET → 401', async () => {
  let r = await callHandler(remind, { method: 'GET', headers: {} });
  assert.strictEqual(r.status, 401);
  r = await callHandler(remind, { method: 'GET', headers: { authorization: 'Bearer sai' } });
  assert.strictEqual(r.status, 401);
});

test('/api/remind: đúng CRON_SECRET → chạy và trả thống kê', async () => {
  push.setSender(async () => 'ok');
  const st = habitState();
  const gasMock = fakeGas(st);
  global.fetch = async (url, opts) => ({ json: async () => gasMock(JSON.parse(opts.body)) });
  const r = await callHandler(remind, { method: 'GET', headers: { authorization: 'Bearer cron-secret-test' } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.ok, true);
});

test('/api/pf: push_subscribe chỉ nhận từ thiết bị di động và gắn với user trong session', async () => {
  const st = { subs: [], calls: [] };
  global.fetch = async (url, opts) => {
    const p = JSON.parse(opts.body); st.calls.push(p);
    if (p.action === 'list') return { json: async () => ({ ok: true, config: { users: 'hiendc:1998' }, items: [] }) };
    if (p.action === 'push_save') return { json: async () => ({ ok: true }) };
    return { json: async () => ({ ok: false, error: 'unknown_action' }) };
  };
  let r = await callHandler(pf, { method: 'POST', body: { action: 'login', username: 'hiendc', password: '1998' }, headers: {} });
  const auth = { authorization: 'Bearer ' + r.body.session };
  const subscription = { endpoint: 'https://push.example/abc', keys: { p256dh: 'pk', auth: 'ak' } };

  r = await callHandler(pf, { method: 'POST', body: { action: 'push_subscribe', subscription, spend: true, habit: true }, headers: auth });
  assert.strictEqual(r.status, 400); // thiếu mobile: true
  r = await callHandler(pf, { method: 'POST', body: { action: 'push_subscribe', subscription, spend: true, habit: false, mobile: true, username: 'trangdt' }, headers: auth });
  assert.strictEqual(r.status, 200);
  const saved = st.calls.find((c) => c.action === 'push_save');
  assert.strictEqual(saved.username, 'hiendc');
  assert.strictEqual(saved.habit, false);
  r = await callHandler(pf, { method: 'POST', body: { action: 'push_subscribe', subscription, mobile: true }, headers: {} });
  assert.strictEqual(r.status, 401);
  r = await callHandler(pf, { method: 'POST', body: { action: 'push_key' }, headers: auth });
  assert.strictEqual(r.body.key, 'BPublicKeyForTest');
});
