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

  // Trả về {content, amount} hoặc ném Error với thông báo tiếng Việt.
  function parse(input) {
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
    return { content: content, amount: amount };
  }

  var api = { parse: parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PFParser = api;
})(typeof self !== 'undefined' ? self : this);
