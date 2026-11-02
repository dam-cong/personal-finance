/**
 * API mỏng cho Personal Finance (bản đơn giản).
 * Dán file này vào Apps Script gắn với Google Sheet, chạy setup() một lần,
 * đặt Script Property TOKEN, rồi Deploy > Web app (Execute as: Me, Access: Anyone).
 */
var TX_SHEET = 'transactions';
var CFG_SHEET = 'config';
var TZ = 'Asia/Ho_Chi_Minh';
var TX_HEADER = ['id', 'created_at', 'username', 'content', 'amount', 'deleted'];

// Chạy tay một lần: tạo 2 tab + header + cấu hình mẫu (không ghi đè nếu đã có).
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tx = ss.getSheetByName(TX_SHEET) || ss.insertSheet(TX_SHEET);
  if (tx.getLastRow() === 0) tx.appendRow(TX_HEADER);
  // Cột text để Sheets không tự đổi ngày/công thức.
  tx.getRange('B:D').setNumberFormat('@');

  var cfg = ss.getSheetByName(CFG_SHEET) || ss.insertSheet(CFG_SHEET);
  if (cfg.getLastRow() === 0) {
    cfg.getRange('A:B').setNumberFormat('@');
    cfg.getRange(1, 1, 7, 2).setValues([
      ['key', 'value'],
      ['app_name', 'Personal Finance Chat'],
      ['household_name', 'Nhà của tôi'],
      ['slogan', ''],
      ['primary_color', '#2563EB'],
      ['users', 'user1:matkhau1,user2:matkhau2'],
      ['monthly_budget', '10000000'],
    ]);
  }
}

function doGet(e) {
  return handle_(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  var p;
  try {
    p = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }
  return handle_(p);
}

function handle_(p) {
  var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!token || p.token !== token) return json_({ ok: false, error: 'unauthorized' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (p.action === 'list') return json_({ ok: true, config: readConfig_(), items: readItems_() });
    if (p.action === 'add') return json_(add_(p));
    if (p.action === 'update') return json_(update_(p));
    if (p.action === 'delete') return json_(remove_(p));
    if (p.action === 'setconfig') return json_(setConfig_(p));
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: 'server_error' });
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function txSheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TX_SHEET);
  if (!sh) throw new Error('chưa chạy setup()');
  return sh;
}

function isoNow_() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function readConfig_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CFG_SHEET);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    var k = String(r[0]).trim();
    if (k) out[k] = String(r[1]);
  });
  return out;
}

var CFG_KEYS = ['app_name', 'household_name', 'slogan', 'primary_color', 'monthly_budget']; // không cho sửa users qua API (chứa mật khẩu)

// Cập nhật cấu hình: chỉ nhận key trong CFG_KEYS, kiểm tra giá trị; thiếu dòng thì thêm mới.
function setConfig_(p) {
  var vals = p.values || {};
  var clean = {};
  for (var i = 0; i < CFG_KEYS.length; i++) {
    var k = CFG_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(vals, k)) continue;
    var v = String(vals[k] == null ? '' : vals[k]).trim();
    if (v.length > 200) return { ok: false, error: 'invalid_' + k };
    if (k === 'primary_color' && v !== '' && !/^#[0-9a-fA-F]{6}$/.test(v)) return { ok: false, error: 'invalid_' + k };
    if (k === 'monthly_budget') {
      v = v.replace(/[.,\s]/g, '');
      if (!/^\d*$/.test(v)) return { ok: false, error: 'invalid_' + k };
    }
    clean[k] = v;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG_SHEET);
  if (!sh) { setup(); sh = ss.getSheetByName(CFG_SHEET); }
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  var rowOf = {};
  rows.forEach(function (r, idx) { rowOf[String(r[0]).trim()] = idx + 2; });
  Object.keys(clean).forEach(function (k) {
    var row = rowOf[k];
    if (!row) { row = sh.getLastRow() + 1; sh.getRange(row, 1, 1, 2).setNumberFormats([['@', '@']]); sh.getRange(row, 1).setValue(k); }
    sh.getRange(row, 2).setNumberFormat('@').setValue(clean[k]);
  });
  return { ok: true, config: readConfig_() };
}

function readItems_() {
  var sh = txSheet_();
  if (sh.getLastRow() < 2) return [];
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  var items = [];
  rows.forEach(function (r) {
    if (r[0] === '' || r[5] === true || String(r[5]).toUpperCase() === 'TRUE') return;
    var created = r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, "yyyy-MM-dd'T'HH:mm:ssXXX") : String(r[1]);
    items.push({
      id: Number(r[0]),
      created_at: created,
      username: String(r[2]),
      content: String(r[3]),
      amount: Number(r[4]),
    });
  });
  return items;
}

// created_at tuỳ chọn khi ghi bù: dạng 2026-10-15T12:00:00+07:00, không ở tương lai, không quá 5 năm.
function validCreatedAt_(s) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/.test(s)) return false;
  var t = new Date(s).getTime();
  var now = Date.now();
  return isFinite(t) && t <= now + 10 * 60 * 1000 && t >= now - 5 * 365 * 86400000;
}

function add_(p) {
  var content = String(p.content || '').trim();
  var username = String(p.username || '').trim();
  var amount = Number(p.amount);
  if (!content || content.length > 200 || !username || !isFinite(amount) || amount <= 0 || Math.floor(amount) !== amount) {
    return { ok: false, error: 'invalid' };
  }
  var created = isoNow_();
  if (p.created_at) {
    if (!validCreatedAt_(String(p.created_at))) return { ok: false, error: 'invalid' };
    created = String(p.created_at);
  }
  var item = { id: Date.now(), created_at: created, username: username, content: content, amount: amount };
  var sh = txSheet_();
  var row = sh.getLastRow() + 1;
  // Định dạng text trước khi ghi để "=1+1" lưu thành chữ, không thành công thức.
  sh.getRange(row, 1, 1, 6).setNumberFormats([['0', '@', '@', '@', '0', 'General']]);
  sh.getRange(row, 1, 1, 6).setValues([[item.id, item.created_at, item.username, item.content, item.amount, false]]);
  return { ok: true, item: item };
}

// Sửa nội dung / số tiền / ngày của một khoản (không đổi người nhập).
function update_(p) {
  var id = Number(p.id);
  var content = String(p.content || '').trim();
  var amount = Number(p.amount);
  if (!content || content.length > 200 || !isFinite(amount) || amount <= 0 || Math.floor(amount) !== amount) {
    return { ok: false, error: 'invalid' };
  }
  var created = p.created_at ? String(p.created_at) : '';
  if (created && !validCreatedAt_(created)) return { ok: false, error: 'invalid' };
  var sh = txSheet_();
  if (sh.getLastRow() < 2) return { ok: false, error: 'not_found' };
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (Number(r[0]) !== id || r[5] === true || String(r[5]).toUpperCase() === 'TRUE') continue;
    var row = i + 2;
    if (created) sh.getRange(row, 2).setNumberFormat('@').setValue(created);
    sh.getRange(row, 4).setNumberFormat('@').setValue(content);
    sh.getRange(row, 5).setValue(amount);
    var at = created || (r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, "yyyy-MM-dd'T'HH:mm:ssXXX") : String(r[1]));
    return { ok: true, item: { id: id, created_at: at, username: String(r[2]), content: content, amount: amount } };
  }
  return { ok: false, error: 'not_found' };
}

function remove_(p) {
  var id = Number(p.id);
  var sh = txSheet_();
  if (sh.getLastRow() < 2) return { ok: false, error: 'not_found' };
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) === id) {
      sh.getRange(i + 2, 6).setValue(true);
      return { ok: true };
    }
  }
  return { ok: false, error: 'not_found' };
}
