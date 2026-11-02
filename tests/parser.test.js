// Chạy: node tests/parser.test.js — đối chiếu với parser_test.go
const { parse } = require('../parser');

const ok = [
  ['Cafe Highland 45000', 'Cafe Highland', 45000],
  ['Cafe 45k', 'Cafe', 45000],
  ['Cafe 45K', 'Cafe', 45000],
  ['Cafe 45 k', 'Cafe', 45000],
  ['Cafe 45.000', 'Cafe', 45000],
  ['Cafe 45,000', 'Cafe', 45000],
  ['Cafe 45 000', 'Cafe', 45000],
  ['Đi chợ 1.200.500', 'Đi chợ', 1200500],
  ['Ăn sáng\n35000', 'Ăn sáng', 35000],
  ['Ăn sáng\nĂn trưa\n40000', 'Ăn sáng\nĂn trưa', 40000],
  ['  Cafe 45.000  ', 'Cafe', 45000],
  ['Ăn sáng\n35000\n', 'Ăn sáng', 35000],
  ['Ngày 5 ăn trưa 35000', 'Ngày 5 ăn trưa', 35000],
  ['Cafe 1 triệu', 'Cafe', 1000000],
  ['Đi chợ 2.5 triệu', 'Đi chợ', 2500000],
];
const bad = ['', '   ', 'abc', 'Đi chợ', '45000', 'Ăn sáng\n', 'Cafe -45000', 'Cafe abc 123xyz'];

let fail = 0;
for (const [input, content, amount] of ok) {
  try {
    const r = parse(input);
    if (r.content !== content || r.amount !== amount) throw new Error(JSON.stringify(r));
  } catch (e) {
    fail++;
    console.log('FAIL ok   ', JSON.stringify(input), '->', e.message);
  }
}
for (const input of bad) {
  try {
    const r = parse(input);
    fail++;
    console.log('FAIL bad  ', JSON.stringify(input), '->', JSON.stringify(r));
  } catch (_) {}
}
console.log(fail ? fail + ' lỗi' : 'Tất cả ' + (ok.length + bad.length) + ' case pass');

// ---- Tiền tố ngày (giả lập hôm nay = 2026-11-02 10:30 giờ VN) ----
const { parse: p2, datePrefix, toISO } = require('../parser');
const NOW = Date.UTC(2026, 10, 2, 3, 30, 0); // 03:30 UTC = 10:30 VN
const D = (y, m, d) => ({ y, m, d });
const dateCases = [
  ['hôm nay Cafe 45k', 'Cafe', 45000, D(2026, 11, 2)],
  ['hôm qua Cafe 45k', 'Cafe', 45000, D(2026, 11, 1)],
  ['Hôm kia Đi chợ 200k', 'Đi chợ', 200000, D(2026, 10, 31)],
  ['15/10 Đi chợ 200k', 'Đi chợ', 200000, D(2026, 10, 15)],
  ['5/1 Ăn sáng 35000', 'Ăn sáng', 35000, D(2026, 1, 5)],
  ['15/10/2025 Cafe 45k', 'Cafe', 45000, D(2025, 10, 15)],
  ['15/10/25 Cafe 45k', 'Cafe', 45000, D(2025, 10, 15)],
  ['hôm qua Ăn sáng\n35000', 'Ăn sáng', 35000, D(2026, 11, 1)],
  ['  hôm qua   Cafe 45k  ', 'Cafe', 45000, D(2026, 11, 1)],
  // không phải ngày → coi là nội dung thường
  ['31/02 Cafe 45k', '31/02 Cafe', 45000, null],
  ['1/12 Cafe 45k', '1/12 Cafe', 45000, null], // tương lai
  ['Cafe hôm qua 45k', 'Cafe hôm qua', 45000, null], // chỉ nhận tiền tố ở đầu
  ['Ngày 5 ăn trưa 35000', 'Ngày 5 ăn trưa', 35000, null],
];
for (const [input, content, amount, date] of dateCases) {
  try {
    const r = p2(input, NOW);
    if (r.content !== content || r.amount !== amount || JSON.stringify(r.date) !== JSON.stringify(date)) throw new Error(JSON.stringify(r));
  } catch (e) { fail++; console.log('FAIL date', JSON.stringify(input), '->', e.message); }
}
for (const input of ['hôm qua Cafe', 'hôm qua']) {
  try { const r = p2(input, NOW); fail++; console.log('FAIL date bad', JSON.stringify(input), JSON.stringify(r)); } catch (_) {}
}
// datePrefix chạy được cả khi chưa gõ xong số tiền (dùng cho gợi ý ngày)
const dp = datePrefix('hôm qua Cafe', NOW);
if (!dp || JSON.stringify(dp.date) !== JSON.stringify(D(2026, 11, 1)) || dp.rest !== 'Cafe') { fail++; console.log('FAIL datePrefix', dp); }
// toISO: hôm nay giữ giờ hiện tại, ngày cũ 12:00
if (toISO(D(2026, 11, 2), NOW) !== '2026-11-02T10:30:00+07:00') { fail++; console.log('FAIL toISO today', toISO(D(2026, 11, 2), NOW)); }
if (toISO(D(2026, 10, 15), NOW) !== '2026-10-15T12:00:00+07:00') { fail++; console.log('FAIL toISO old', toISO(D(2026, 10, 15), NOW)); }
// qua nửa đêm: 17:30 UTC ngày 2/11 = 00:30 ngày 3/11 giờ VN
const late = Date.UTC(2026, 10, 2, 17, 30, 0);
const dl = p2('hôm qua Cafe 45k', late);
if (JSON.stringify(dl.date) !== JSON.stringify(D(2026, 11, 2))) { fail++; console.log('FAIL qua nửa đêm', dl); }
console.log(fail ? fail + ' lỗi (gồm ngày)' : 'Ca ngày: pass');
process.exit(fail ? 1 : 0);
