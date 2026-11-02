// Chạy: node tests/proxy.test.js — test api/pf.js với Apps Script giả (không cần mạng).
process.env.APPS_SCRIPT_URL = 'https://example.test/exec';
process.env.APPS_TOKEN = 'token-test-123';

const handler = require('../api/pf');
const { sign, verify, parseUsers } = handler._test;

// Sheet giả
let cfg, items, calls;
function reset() {
  cfg = { app_name: 'FamFin', household_name: 'Nhà', users: 'hiendc:1998,trangdt:1999', monthly_budget: '1000' };
  items = [
    { id: 1, username: 'hiendc', content: 'Cafe', amount: 45000, created_at: '2026-11-01T10:00:00+07:00' },
    { id: 2, username: 'trangdt', content: 'Chợ', amount: 100000, created_at: '2026-11-01T11:00:00+07:00' },
  ];
  calls = [];
}
global.fetch = async (url, opts) => {
  const p = JSON.parse(opts.body);
  calls.push(p);
  let out;
  if (p.token !== 'token-test-123') out = { ok: false, error: 'unauthorized' };
  else if (p.action === 'list') out = { ok: true, config: cfg, items };
  else if (p.action === 'add') out = { ok: true, item: { id: 99, username: p.username, content: p.content, amount: p.amount } };
  else if (p.action === 'delete') out = { ok: true };
  else if (p.action === 'setconfig') { Object.assign(cfg, p.values); out = { ok: true, config: cfg }; }
  else out = { ok: false, error: 'unknown_action' };
  return { json: async () => out };
};

function call(body, headers, method) {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; },
      end(s) { resolve({ status: this.statusCode, body: JSON.parse(s) }); } };
    handler({ method: method || 'POST', body, headers: headers || {} }, res);
  });
}
const bearer = (s) => ({ authorization: 'Bearer ' + s });

let fail = 0;
function check(name, cond, extra) {
  if (!cond) { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

(async () => {
  reset();
  // login
  let r = await call({ action: 'login', username: 'hiendc', password: '1998' });
  check('login ok', r.status === 200 && r.body.ok && r.body.session, r);
  const session = r.body.session;
  check('session verify', verify('token-test-123', session) === 'hiendc');
  check('session sai token', verify('khac', session) === null);
  check('session bị sửa', verify('token-test-123', session.slice(0, -2) + 'xx') === null);
  check('session hết hạn', verify('token-test-123', sign('token-test-123', 'a', Date.now() - 31 * 864e5)) === null);
  check('session rác', verify('token-test-123', 'abc') === null && verify('token-test-123', undefined) === null);

  r = await call({ action: 'login', username: 'hiendc', password: 'sai' });
  check('login sai mật khẩu', r.status === 401 && r.body.error === 'bad_credentials', r);
  r = await call({ action: 'login', username: 'khongco', password: '1998' });
  check('login sai user', r.status === 401, r);
  r = await call({ action: 'login', username: '', password: '' });
  check('login rỗng', r.status === 401, r);

  // list: không lộ mật khẩu, không lộ token
  r = await call({ action: 'list' }, bearer(session));
  check('list ok', r.status === 200 && r.body.items.length === 2, r);
  check('list ẩn mật khẩu', r.body.config.users === 'hiendc,trangdt' && JSON.stringify(r.body).indexOf('1998') < 0 && JSON.stringify(r.body).indexOf('token-test') < 0, r.body.config);
  r = await call({ action: 'list' });
  check('list thiếu session → 401', r.status === 401, r);
  r = await call({ action: 'list' }, bearer('rac.rac'));
  check('list session giả → 401', r.status === 401, r);

  // add: username lấy từ session, bỏ qua client
  calls = [];
  r = await call({ action: 'add', content: 'Phở', amount: 60000, username: 'trangdt' }, bearer(session));
  check('add ok', r.status === 200 && r.body.item.username === 'hiendc', r);
  check('add gửi username từ session', calls[0].username === 'hiendc', calls);

  // delete: chỉ xoá khoản của mình
  calls = [];
  r = await call({ action: 'delete', id: 2 }, bearer(session));
  check('delete khoản người khác → 403', r.status === 403 && !calls.some((c) => c.action === 'delete'), r);
  r = await call({ action: 'delete', id: 1 }, bearer(session));
  check('delete khoản của mình', r.status === 200 && calls.some((c) => c.action === 'delete'), r);
  r = await call({ action: 'delete', id: 12345 }, bearer(session));
  check('delete không tồn tại → 404', r.status === 404, r);

  // setconfig: chặn key users và key lạ
  r = await call({ action: 'setconfig', values: { household_name: 'Mới', users: 'hack:1', evil: 'x' } }, bearer(session));
  check('setconfig ok', r.status === 200 && cfg.household_name === 'Mới', r);
  check('setconfig chặn users', cfg.users === 'hiendc:1998,trangdt:1999' && cfg.evil === undefined, cfg);
  check('setconfig trả users đã ẩn mật khẩu', r.body.config.users === 'hiendc,trangdt', r.body.config);

  // khác
  r = await call({ action: 'xyz' }, bearer(session));
  check('action lạ → 400', r.status === 400, r);
  r = await call({ action: 'list' }, {}, 'GET');
  check('GET → 405', r.status === 405, r);
  r = await call('không-phải-json');
  check('body rác → 400', r.status === 400, r);

  // parseUsers
  const u = parseUsers(' a:1 , b:2:3, c, :x, d: ');
  check('parseUsers', u.length === 2 && u[0].name === 'a' && u[1].pass === '2:3', u);

  // thiếu env
  const old = process.env.APPS_TOKEN; delete process.env.APPS_TOKEN;
  r = await call({ action: 'list' }, bearer(session));
  check('thiếu env → not_configured', r.status === 500 && r.body.error === 'not_configured', r);
  process.env.APPS_TOKEN = old;

  console.log(fail ? fail + ' lỗi' : 'Tất cả test proxy pass');
  process.exit(fail ? 1 : 0);
})();
