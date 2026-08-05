> **Trạng thái:** Đã triển khai. `WeekdaySpendingChart.tsx` đã tạo và đặt
> phía trên `SpendingChart` trong `DashboardPage.tsx` (theo yêu cầu bổ sung
> của người dùng, khác vị trí "phía dưới" ghi ban đầu — đã cập nhật lại mục
> "Vị trí đặt" ở trên cho khớp thực tế). `rangeStart`/`rangeEnd` tính trong
> `DashboardPage.tsx` theo period/year/month/quarter đang chọn. Build/lint
> pass, server đã phục vụ bundle mới. Còn cần người dùng xác nhận bằng mắt
> trên trình duyệt (chưa có công cụ chụp màn hình ở môi trường này).

# Biểu đồ đường: chi tiêu theo ngày trong tuần

## Context
Dashboard hiện có biểu đồ cột "Chi tiêu theo ngày" (trong tháng) /
"theo tháng" (quý/năm) ở `SpendingChart.tsx`, nhóm chi tiêu theo **ngày lịch
cụ thể** (1/8, 2/8, ...). Người dùng muốn thêm một biểu đồ **đường** riêng,
nhóm chi tiêu theo **thứ trong tuần** (Thứ 2 → Chủ nhật) để thấy được xu
hướng: ngày nào trong tuần thường chi tiêu nhiều/ít hơn — bổ sung góc nhìn
mới bên cạnh biểu đồ theo ngày lịch đã có, không thay thế nó.

## Nguồn dữ liệu — không cần sửa backend
`DashboardData.transactions` (trả về từ `GET /dashboard/{month,quarter,year}`,
xem `frontend/src/types/index.ts`) đã chứa toàn bộ giao dịch của kỳ đang chọn,
mỗi giao dịch có `amount` và `created_at` (ISO datetime). Có thể tính toán
nhóm theo thứ-trong-tuần **hoàn toàn ở phía frontend** từ mảng này, không cần
endpoint mới, không cần sửa Go backend (môi trường dev hiện không có Go
toolchain để build lại backend — xem `.claude/skills/run/SKILL.md`).

## Cách tính: trung bình theo thứ, không phải tổng
Một tháng/quý/năm không có số lượng Thứ 2, Thứ 3... bằng nhau (ví dụ tháng có
5 Chủ nhật nhưng chỉ 4 Thứ Tư) — nếu cộng tổng theo thứ sẽ bị lệch (thứ nào
xuất hiện nhiều lần hơn trong kỳ dễ bị hiểu nhầm là "chi nhiều hơn"). Vì vậy
chọn tính **trung bình chi tiêu mỗi lần thứ đó xuất hiện trong kỳ**:

```
tổng theo thứ X = sum(amount của các giao dịch rơi vào thứ X)
số lần thứ X xuất hiện trong kỳ = đếm số ngày lịch riêng biệt là thứ X trong
                                   khoảng thời gian của kỳ đang chọn
trung bình thứ X = tổng theo thứ X / số lần xuất hiện (0 nếu không xuất hiện)
```

Thứ tự hiển thị: Thứ 2 → Chủ nhật (quy ước tuần Việt Nam), nhãn ngắn gọn
`T2, T3, T4, T5, T6, T7, CN`.

## Phạm vi thay đổi
- **File mới:** `frontend/src/components/dashboard/WeekdaySpendingChart.tsx`
  — nhận prop `transactions: Transaction[]` và khoảng thời gian của kỳ đang
  chọn (để đếm đúng số lần mỗi thứ xuất hiện), tự tính toán rồi vẽ
  `LineChart` (Recharts, cùng convention với `SpendingChart.tsx`:
  `ResponsiveContainer`, `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip` dùng
  `formatVND`, card `rounded-xl bg-white p-5 shadow-sm`).
- **Sửa:** `frontend/src/pages/DashboardPage.tsx` — render
  `<WeekdaySpendingChart transactions={data?.transactions ?? []} ... />`
  ngay **phía trên** `<SpendingChart />` hiện có (trước dòng ~104), tức thứ
  tự hiển thị trên Dashboard sẽ là: SummaryCards → **WeekdaySpendingChart**
  → SpendingChart (theo ngày lịch) → TransactionList.
- Không đổi `types/index.ts`, không đổi API/backend.

## Thiết kế component (phác thảo)

```tsx
// frontend/src/components/dashboard/WeekdaySpendingChart.tsx
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatVND } from '../../lib/format'
import type { Transaction } from '../../types'

interface Props {
  transactions: Transaction[]
  rangeStart: Date // ngày đầu kỳ đang chọn
  rangeEnd: Date   // ngày cuối kỳ đang chọn (bao gồm)
}

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
// JS getDay(): 0=CN,1=T2,...6=T7 -> map sang thứ tự hiển thị T2..CN
const JS_DAY_TO_INDEX = [6, 0, 1, 2, 3, 4, 5]

function buildWeekdayData(transactions: Transaction[], rangeStart: Date, rangeEnd: Date) {
  const totals = new Array(7).fill(0)
  const counts = new Array(7).fill(0)

  // đếm số lần mỗi thứ xuất hiện trong khoảng [rangeStart, rangeEnd]
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    counts[JS_DAY_TO_INDEX[d.getDay()]]++
  }

  for (const t of transactions) {
    const idx = JS_DAY_TO_INDEX[new Date(t.created_at).getDay()]
    totals[idx] += t.amount
  }

  return WEEKDAY_LABELS.map((label, i) => ({
    label,
    average: counts[i] > 0 ? Math.round(totals[i] / counts[i]) : 0,
  }))
}

export default function WeekdaySpendingChart({ transactions, rangeStart, rangeEnd }: Props) {
  const data = buildWeekdayData(transactions, rangeStart, rangeEnd)

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">
        Chi tiêu trung bình theo ngày trong tuần
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            fontSize={11} tickLine={false} axisLine={false} width={48}
          />
          <Tooltip formatter={(value) => [formatVND(Number(value)), 'TB chi tiêu']} />
          <Line type="monotone" dataKey="average" stroke="#2563eb" strokeWidth={2}
                dot={{ r: 3, fill: '#2563eb' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

**Tính `rangeStart`/`rangeEnd` ở `DashboardPage.tsx`** dựa trên `period`/`year`/
`month`/`quarter` đang chọn (period="month" → đầu/cuối tháng đó;
"quarter" → đầu/cuối quý; "year" → 1/1–31/12 năm đó) — đây là logic thuần
JS Date, không cần dữ liệu mới từ backend.

## Vị trí đặt trong Dashboard
Ngay **phía trên** `<SpendingChart />` (dòng ~104 `DashboardPage.tsx`), hiển
thị ở mọi `period` (tháng/quý/năm) — không chỉ riêng tháng, vì "trung bình
theo thứ" vẫn có ý nghĩa khi xem theo quý/năm (càng nhiều dữ liệu, số trung
bình càng ổn định).

## Kiểm thử (sau khi code xong)
1. `cd frontend && npm run lint && npm run build` — không lỗi type/lint.
2. Theo skill `run`: build + xác nhận server đang chạy phục vụ đúng bundle mới.
3. Kiểm tra bằng mắt trên `/dashboard`:
   - Biểu đồ đường hiện đúng 7 điểm T2→CN, không lệch thứ tự.
   - Đổi period Tháng/Quý/Năm, số liệu thay đổi hợp lý (quý/năm có nhiều dữ
     liệu hơn nên đường mượt hơn).
   - Tooltip hiện đúng định dạng tiền VNĐ khi hover từng điểm.
   - Trường hợp kỳ chưa có giao dịch nào: đường phẳng ở 0, không lỗi/crash.
   - Responsive: desktop (≥1024px) và mobile (<400px) không tràn ngang.
