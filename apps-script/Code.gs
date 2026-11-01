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
      ['users', 'Người 1,Người 2'],
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
    if (p.action === 'delete') return json_(remove_(p));
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

function add_(p) {
  var content = String(p.content || '').trim();
  var username = String(p.username || '').trim();
  var amount = Number(p.amount);
  if (!content || !username || !isFinite(amount) || amount <= 0 || Math.floor(amount) !== amount) {
    return { ok: false, error: 'invalid' };
  }
  var item = { id: Date.now(), created_at: isoNow_(), username: username, content: content, amount: amount };
  var sh = txSheet_();
  var row = sh.getLastRow() + 1;
  // Định dạng text trước khi ghi để "=1+1" lưu thành chữ, không thành công thức.
  sh.getRange(row, 1, 1, 6).setNumberFormats([['0', '@', '@', '@', '0', 'General']]);
  sh.getRange(row, 1, 1, 6).setValues([[item.id, item.created_at, item.username, item.content, item.amount, false]]);
  return { ok: true, item: item };
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
