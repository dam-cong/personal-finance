const test = require('node:test');
const assert = require('node:assert');
const H = require('../habits');

// 2026-11-02 là Thứ Hai.
const daily = { id: 1, days: '1,2,3,4,5,6,7', created_date: '2026-11-01', ended_date: '' };
const weekdays = { id: 2, days: '1,2,3,4,5', created_date: '2026-11-01', ended_date: '' };

test('weekday: T2=1 … CN=7', () => {
  assert.strictEqual(H.weekday('2026-11-02'), 1);
  assert.strictEqual(H.weekday('2026-11-08'), 7);
});

test('appliesOn: theo thứ, ngày tạo và ngày kết thúc', () => {
  assert.strictEqual(H.appliesOn(weekdays, '2026-11-07'), false); // Thứ Bảy
  assert.strictEqual(H.appliesOn(weekdays, '2026-11-06'), true);
  assert.strictEqual(H.appliesOn(daily, '2026-10-31'), false); // trước ngày tạo
  assert.strictEqual(H.appliesOn(Object.assign({}, daily, { ended_date: '2026-11-05' }), '2026-11-05'), false);
  assert.strictEqual(H.appliesOn(Object.assign({}, daily, { ended_date: '2026-11-05' }), '2026-11-04'), true);
});

test('dayStats: phần trăm và ngày không có việc', () => {
  const done = H.doneMap([{ date: '2026-11-02', habit_id: 1 }]);
  assert.deepStrictEqual(H.dayStats([daily, weekdays], done, '2026-11-02'), { total: 2, done: 1, pct: 50 });
  assert.strictEqual(H.dayStats([weekdays], done, '2026-11-07').pct, null);
});

test('rangeStats + average bỏ qua ngày trống', () => {
  const done = H.doneMap([{ date: '2026-11-06', habit_id: 2 }]);
  const st = H.rangeStats([weekdays], done, '2026-11-06', '2026-11-08'); // T6, T7, CN
  assert.strictEqual(st.length, 3);
  assert.strictEqual(st[0].pct, 100);
  assert.strictEqual(st[1].pct, null);
  assert.strictEqual(H.average(st), 100);
});

test('streak: hôm nay chưa xong thì chưa đứt; ngày trống không làm đứt', () => {
  const logs = [];
  ['2026-11-04', '2026-11-05', '2026-11-06'].forEach((d) => logs.push({ date: d, habit_id: 2 })); // T4, T5, T6
  const done = H.doneMap(logs);
  assert.strictEqual(H.streak([weekdays], done, '2026-11-06'), 3);
  assert.strictEqual(H.streak([weekdays], done, '2026-11-08'), 3); // CN không có việc, T7 trống -> vẫn 3
  assert.strictEqual(H.streak([weekdays], done, '2026-11-09'), 3); // T2 hôm nay chưa tích: chưa đứt
  const miss = H.doneMap([{ date: '2026-11-06', habit_id: 2 }]);
  assert.strictEqual(H.streak([weekdays], miss, '2026-11-06'), 1); // T5 sót -> dừng
});

test('bestStreak', () => {
  const done = H.doneMap(['2026-11-02', '2026-11-03', '2026-11-05'].map((d) => ({ date: d, habit_id: 2 })));
  assert.strictEqual(H.bestStreak([weekdays], done, '2026-11-02', '2026-11-06'), 2);
});

test('perHabit chỉ gồm việc có ngày áp dụng', () => {
  const done = H.doneMap([{ date: '2026-11-02', habit_id: 1 }]);
  const r = H.perHabit([daily, weekdays], done, '2026-11-02', '2026-11-03');
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0].pct, 50);
  assert.strictEqual(r[1].pct, 0);
});

test('message theo mức', () => {
  assert.match(H.message({ total: 0, pct: null }), /chưa có việc/);
  assert.match(H.message({ total: 4, pct: 100 }), /hoàn thành tất cả/);
  assert.match(H.message({ total: 4, pct: 0 }), /Bắt đầu/);
});
