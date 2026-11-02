// Port từ backend/internal/services/parser.go — giữ nguyên hành vi.
(function (root) {
  var amountAtEndRe = /(\d[\d.,\s]*?)(\s*(?:[kK]|triệu))?\s*$/;
  var amountOnlyRe = /^\s*(\d[\d.,\s]*)(\s*(?:[kK]|triệu))?\s*$/;

  function parseAmount(raw) {
    var m = amountOnlyRe.exec(raw);
    if (!m) throw new Error('không tìm thấy số tiền');
    var suffix = (m[2] || '').trim().toLowerCase();
    var v;
    if (suffix === 'triệu') {
      var f = Number(m[1].replace(/[,\s]/g, ''));
      if (!isFinite(f)) throw new Error('số tiền không hợp lệ');
      v = Math.round(f * 1000000);
      if (v <= 0) throw new Error('số tiền phải lớn hơn 0');
      return v;
    }
    var num = m[1].replace(/[.,\s]/g, '');
    if (!/^\d+$/.test(num)) throw new Error('số tiền không hợp lệ');
    v = parseInt(num, 10) * (suffix === 'k' ? 1000 : 1);
    if (!Number.isSafeInteger(v)) throw new Error('số tiền quá lớn');
    return v;
  }

  var DAY = 86400000, TZ = 7 * 3600000; // múi giờ Việt Nam
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  // Ngày hôm nay theo giờ VN: {y, m, d} (m = 1..12)
  function vnToday(now) {
    var t = new Date((now == null ? Date.now() : +now) + TZ);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function utcOf(y, m, d) { return Date.UTC(y, m - 1, d); }
  function fromUtc(ms) { var t = new Date(ms); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }

  var datePrefixRe = /^(hôm nay|hôm qua|hôm kia|(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?)\s+([\s\S]+)$/i;
  // Tách tiền tố ngày ở đầu chuỗi. Trả về {date:{y,m,d}, rest} hoặc null nếu không có/ không hợp lệ/ ở tương lai.
  function datePrefix(input, now) {
    var s = String(input == null ? '' : input).normalize('NFC').trim();
    var m = datePrefixRe.exec(s);
    if (!m) return null;
    var today = vnToday(now), todayMs = utcOf(today.y, today.m, today.d), date;
    var word = m[1].toLowerCase();
    if (word === 'hôm nay') date = today;
    else if (word === 'hôm qua') date = fromUtc(todayMs - DAY);
    else if (word === 'hôm kia') date = fromUtc(todayMs - 2 * DAY);
    else {
      var d = +m[2], mo = +m[3], y = m[4] ? (m[4].length === 2 ? 2000 + +m[4] : +m[4]) : today.y;
      var chk = fromUtc(utcOf(y, mo, d));
      if (mo < 1 || mo > 12 || chk.y !== y || chk.m !== mo || chk.d !== d) return null; // ngày không tồn tại (31/02...)
      if (utcOf(y, mo, d) > todayMs) return null; // không ghi cho tương lai
      date = { y: y, m: mo, d: d };
    }
    return { date: date, rest: m[5].trim() };
  }
  // ISO 8601 +07:00: ngày hôm nay giữ giờ hiện tại, ngày cũ đặt 12:00 để không lệch ngày.
  function toISO(date, now) {
    var n = new Date((now == null ? Date.now() : +now) + TZ), t = vnToday(now);
    var today = date.y === t.y && date.m === t.m && date.d === t.d;
    var hh = today ? n.getUTCHours() : 12, mm = today ? n.getUTCMinutes() : 0, ss = today ? n.getUTCSeconds() : 0;
    return date.y + '-' + pad(date.m) + '-' + pad(date.d) + 'T' + pad(hh) + ':' + pad(mm) + ':' + pad(ss) + '+07:00';
  }

  // Trả về {content, amount, date} (date = {y,m,d} hoặc null) hoặc ném Error với thông báo tiếng Việt.
  function parse(input, now) {
    var dp = datePrefix(input, now);
    if (dp) {
      try {
        var r = parseCore(dp.rest);
        r.date = dp.date;
        return r;
      } catch (e) {
        try { return parseCore(input); } catch (e2) { throw e; } // "15/10 45000": coi 15/10 là nội dung
      }
    }
    return parseCore(input);
  }

  function parseCore(input) {
    var s = String(input == null ? '' : input).trim();
    if (s === '') throw new Error('chuỗi rỗng');

    var content, rawAmount;
    if (s.indexOf('\n') >= 0) {
      var lines = s.split('\n');
      var last = lines[lines.length - 1].trim();
      if (last === '') throw new Error('không tìm thấy số tiền');
      content = lines.slice(0, -1).join('\n').trim();
      rawAmount = last;
    } else {
      var m = amountAtEndRe.exec(s);
      if (!m) throw new Error('không tìm thấy số tiền');
      content = s.slice(0, m.index).trim();
      rawAmount = s.slice(m.index);
      if (content.slice(-1) === '-') throw new Error('số tiền không hợp lệ');
    }

    var amount = parseAmount(rawAmount);
    if (amount <= 0) throw new Error('số tiền phải lớn hơn 0');
    if (content === '') throw new Error('thiếu nội dung');
    return { content: content, amount: amount, date: null };
  }

  var api = { parse: parse, datePrefix: datePrefix, toISO: toISO, vnToday: vnToday };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PFParser = api;
})(typeof self !== 'undefined' ? self : this);
