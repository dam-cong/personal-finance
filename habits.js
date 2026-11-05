// Logic thuần cho check-list hằng ngày (không đụng DOM/mạng) để dùng ở trình duyệt và test bằng Node.
// Ngày luôn là chuỗi 'yyyy-MM-dd' theo giờ Việt Nam; thứ: 1 = T2 … 7 = CN.
(function (root) {
  var DAY = 86400000;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function parse(s) { // 'yyyy-MM-dd' -> ms UTC của 00:00 ngày đó
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  }
  function fmt(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function addDays(s, n) { return fmt(parse(s) + n * DAY); }
  function weekday(s) { var w = new Date(parse(s)).getUTCDay(); return w === 0 ? 7 : w; }
  function daysOf(h) {
    return String(h.days == null ? '' : h.days).split(',').map(Number).filter(function (n) { return n >= 1 && n <= 7; });
  }

  // Việc h có áp dụng cho ngày d không (xét ngày tạo, ngày kết thúc, thứ trong tuần).
  function appliesOn(h, d) {
    if (h.created_date && d < h.created_date) return false;
    if (h.ended_date && d >= h.ended_date) return false;
    return daysOf(h).indexOf(weekday(d)) >= 0;
  }

  // done: object dạng { 'yyyy-MM-dd|habitId': true }
  function key(d, id) { return d + '|' + id; }
  function doneMap(logs) {
    var m = {};
    (logs || []).forEach(function (l) { m[key(l.date, l.habit_id)] = true; });
    return m;
  }

  // Thống kê một ngày: số việc áp dụng, số việc đã xong, phần trăm (null nếu không có việc nào).
  function dayStats(habits, done, d) {
    var total = 0, ok = 0;
    habits.forEach(function (h) {
      if (!appliesOn(h, d)) return;
      total++;
      if (done[key(d, h.id)]) ok++;
    });
    return { total: total, done: ok, pct: total ? Math.round(ok * 100 / total) : null };
  }

  // Thống kê từng ngày trong [from, to]; trả về mảng { date, total, done, pct }.
  function rangeStats(habits, done, from, to) {
    var out = [];
    for (var d = from; d <= to; d = addDays(d, 1)) {
      var s = dayStats(habits, done, d);
      out.push({ date: d, total: s.total, done: s.done, pct: s.pct });
    }
    return out;
  }

  // % trung bình trên toàn bộ việc của các ngày có việc (không tính ngày trống).
  function average(stats) {
    var t = 0, k = 0;
    stats.forEach(function (s) { t += s.total; k += s.done; });
    return t ? Math.round(k * 100 / t) : null;
  }

  // Tỷ lệ từng việc trong kỳ: [{ habit, total, done, pct }]
  function perHabit(habits, done, from, to) {
    return habits.map(function (h) {
      var total = 0, ok = 0;
      for (var d = from; d <= to; d = addDays(d, 1)) {
        if (!appliesOn(h, d)) continue;
        total++;
        if (done[key(d, h.id)]) ok++;
      }
      return { habit: h, total: total, done: ok, pct: total ? Math.round(ok * 100 / total) : null };
    }).filter(function (x) { return x.total > 0; });
  }

  // Chuỗi ngày liên tiếp hoàn thành 100%, tính lùi từ today. Ngày không có việc thì bỏ qua (không làm đứt chuỗi);
  // riêng hôm nay chưa xong hết thì chưa đứt (vẫn còn thời gian), chuỗi tính từ hôm qua.
  function streak(habits, done, today, minDate) {
    var n = 0, d = today, floor = minDate || addDays(today, -400);
    var first = true;
    while (d >= floor) {
      var s = dayStats(habits, done, d);
      if (s.total) {
        if (s.done === s.total) n++;
        else if (!first) break;
      }
      first = false;
      d = addDays(d, -1);
    }
    return n;
  }

  // Chuỗi dài nhất trong [from, to].
  function bestStreak(habits, done, from, to) {
    var best = 0, cur = 0;
    for (var d = from; d <= to; d = addDays(d, 1)) {
      var s = dayStats(habits, done, d);
      if (!s.total) continue;
      if (s.done === s.total) { cur++; if (cur > best) best = cur; } else cur = 0;
    }
    return best;
  }

  // Câu động viên theo mức hoàn thành của ngày.
  function message(stats) {
    if (!stats.total) return 'Hôm nay chưa có việc nào — nghỉ ngơi nhé 🌿';
    if (stats.pct === 100) return 'Tuyệt vời! Bạn đã hoàn thành tất cả 🎉';
    if (stats.pct >= 50) return 'Hơn nửa chặng đường rồi, cố lên! 💪';
    if (stats.pct > 0) return 'Khởi đầu tốt rồi, tiếp tục nào! 🚀';
    return 'Bắt đầu bằng một việc nhỏ nhé ✨';
  }

  var api = {
    addDays: addDays, weekday: weekday, daysOf: daysOf, appliesOn: appliesOn, doneMap: doneMap, key: key,
    dayStats: dayStats, rangeStats: rangeStats, average: average, perHabit: perHabit,
    streak: streak, bestStreak: bestStreak, message: message
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PFHabits = api;
})(typeof self !== 'undefined' ? self : this);
