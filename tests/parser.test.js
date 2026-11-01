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
process.exit(fail ? 1 : 0);
