> **Trạng thái:** Đã triển khai, có 1 lần chỉnh sửa sau khi người dùng phản
> hồi ảnh chụp bị lỗi lệch tâm. **Sai khác so với plan ban đầu:** bản đầu
> tiên dùng Recharts `PieChart` cho vòng cung + `<div>` absolute riêng cho
> kim — nhưng kim và vòng cung bị lệch tâm (2 hệ tọa độ khác nhau: Recharts
> tự tính margin/kích thước nội bộ, còn kim đặt theo % của container ngoài,
> không khớp), label % cũng bị trôi lên trên. Đã viết lại `BudgetGauge.tsx`
> bằng **SVG thuần** (tự vẽ path vòng cung bằng công thức lượng giác + kim
> là `<line>` cùng `viewBox`), đảm bảo kim/vòng cung/label luôn chung một hệ
> tọa độ, không còn lệch tâm. Không dùng Recharts trong component này nữa.
> Đã build/lint pass, server đã phục vụ bundle mới. Còn cần người dùng xác
> nhận lại bằng mắt trên trình duyệt (chưa có công cụ chụp màn hình ở đây).

# Thay thanh progress bar hạn mức bằng biểu đồ gauge (đồng hồ đo)

## Context
Người dùng gửi ảnh tham khảo một biểu đồ dạng "đồng hồ đo" (gauge/speedometer):
nửa hình tròn chia vùng màu xanh/vàng/đỏ, có kim chỉ, số phần trăm nổi bật, và
2 dòng text giá trị bên dưới. Người dùng muốn dùng kiểu biểu đồ này để thay
cho thanh progress bar tuyến tính hiện đang hiển thị mức độ dùng hạn mức chi
tiêu tháng trong `BudgetCard.tsx` (nằm trên Dashboard), để trực quan/bắt mắt
hơn.

Dự án đã có sẵn `recharts@^3.10.1` (dùng trong `SpendingChart.tsx`), không có
thư viện gauge/speedometer nào khác. Recharts **không có sẵn loại biểu đồ
gauge/kim chỉ** — phải tự dựng từ `PieChart` (giới hạn góc quét 180°) cho
phần vòng cung màu, cộng với kim chỉ vẽ tay bằng `<div>` xoay CSS
(`transform: rotate()`), vì Recharts không có primitive nào cho kim chỉ.
Việc này khả thi hoàn toàn với dependency hiện có, không cần cài thêm gì.

## Phạm vi thay đổi
- **File mới:** `frontend/src/components/dashboard/BudgetGauge.tsx` — component
  hiển thị vòng cung 3 màu + kim chỉ + % ở giữa.
- **Sửa:** `frontend/src/components/dashboard/BudgetCard.tsx` — thay khối
  thanh progress bar (đoạn `<div className="mt-2 h-2.5 w-full ...">`) bằng
  `<BudgetGauge percent={budget.percent} status={budget.status} />`. Xóa
  `barClass()` (không còn dùng). **Giữ nguyên** mọi phần khác: header, dòng
  `spent / amount / percent` phía trên, `statusText()` phía dưới, modal chỉnh
  sửa hạn mức, nút Xóa/Đặt hạn mức.
- Không đổi `types/index.ts` (dùng `BudgetInfo.percent`/`status` sẵn có),
  không đổi backend/API.

## Thiết kế `BudgetGauge`

**Ngưỡng vùng màu (cố định phía client, khớp ý nghĩa `barClass` hiện tại):**

| Vùng | % | Màu (khớp Tailwind hiện dùng) |
|---|---|---|
| Xanh (ok) | 0–70 | `#22c55e` (`green-500`) |
| Vàng (near) | 70–100 | `#facc15` (`yellow-400`) |
| Đỏ (over) | 100–120 (cap) | `#ef4444` (`red-500`) |

`DIAL_MAX = 120` — kim chỉ bị giới hạn (clamp) ở mốc này để không quay quá
vòng cung khi vượt hạn mức nhiều, nhưng **label % vẫn hiển thị số thật** (vd
"134%") chứ không bị cap, chỉ kim là bị cap.

**Công thức góc kim:**
```
clamped   = clamp(percent, 0, 120)
fraction  = clamped / 120                 // 0..1
needleDeg = fraction * 180 - 90           // -90deg (0%) .. 0deg (60%) .. +90deg (120%)
```

**Cấu trúc component** (số đo/offset có thể cần chỉnh nhẹ sau khi nhìn thực tế):
```tsx
// frontend/src/components/dashboard/BudgetGauge.tsx
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { BudgetStatus } from '../../types'

interface Props {
  percent: number
  status: BudgetStatus
}

const DIAL_MAX = 120
const ZONES = [
  { value: 70, fill: '#22c55e' },
  { value: 30, fill: '#facc15' },
  { value: 20, fill: '#ef4444' },
]

export default function BudgetGauge({ percent, status }: Props) {
  const fraction = Math.min(Math.max(percent, 0), DIAL_MAX) / DIAL_MAX
  const needleDeg = fraction * 180 - 90

  return (
    <div className="relative mx-auto mt-2 w-full max-w-[260px]" style={{ height: 120 }}
         role="img" aria-label={`Đã dùng ${percent}% hạn mức`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={ZONES} dataKey="value" cx="50%" cy="100%"
               startAngle={180} endAngle={0}
               innerRadius="62%" outerRadius="100%"
               stroke="#ffffff" strokeWidth={3} isAnimationActive={false}>
            {ZONES.map((z, i) => <Cell key={i} fill={z.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* kim chỉ */}
      <div className="absolute bottom-0 left-1/2 h-[62px] w-[3px] origin-bottom rounded-full bg-gray-700"
           style={{ transform: `translateX(-50%) rotate(${needleDeg}deg)`, transition: 'transform 500ms ease-out' }} />
      <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-gray-700" />

      {/* % ở giữa */}
      <div className="absolute inset-x-0 top-[55%] flex justify-center">
        <span className={`text-2xl font-bold ${
          status === 'over' ? 'text-red-600' : status === 'near' ? 'text-yellow-600' : 'text-green-600'
        }`}>{percent}%</span>
      </div>
    </div>
  )
}
```

**Lưu ý kỹ thuật khi triển khai (cần kiểm tra bằng mắt sau khi build):**
- Hướng góc `startAngle={180} endAngle={0}` giả định vòng cung phồng lên phía
  trên — nếu render ra bị lật/ngược, đổi thành `startAngle={0} endAngle={180}`
  và đảo dấu công thức `needleDeg`.
- Vị trí label % (`top-[55%]`) và độ dài kim (`h-[62px]`) là số khởi điểm dựa
  trên khung `120px` cao / `260px` rộng tối đa — cần chỉnh nhẹ bằng mắt cho
  khớp ảnh mẫu.
- Vòng cung tĩnh (`isAnimationActive={false}`) không animate lại mỗi lần
  refetch dữ liệu; chỉ kim chỉ animate qua CSS transition khi `percent` đổi.
- `role="img"` + `aria-label` để không chỉ dựa vào màu sắc truyền đạt thông tin.

## Responsive
- `ResponsiveContainer width="100%"` co giãn theo chiều ngang; `max-w-[260px]`
  chặn không phồng quá to trên card rộng (desktop), vẫn co nhỏ tốt trên mobile
  (<400px) nhờ padding `p-5` của card đã giới hạn không gian.
- Chiều cao cố định `120px` dùng chung mọi kích thước màn hình (bán kính dùng
  %, không cần breakpoint riêng); nếu duyệt UI thấy chật trên điện thoại rất
  nhỏ, có thể thêm `h-[100px] sm:h-[120px]`.

## Kiểm thử (sau khi code xong)
1. `cd frontend && npm run lint && npm run build` — không lỗi type/lint.
2. Theo skill `run` (`.claude/skills/run/SKILL.md`): build frontend, xác nhận
   server đang chạy phục vụ đúng bundle mới, mở Dashboard.
3. Kiểm tra bằng mắt trên `/dashboard`:
   - Vòng cung hiện đúng 3 màu xanh/vàng/đỏ, không bị lật hướng.
   - Kim chỉ đúng hướng với % thực tế (thử với budget test data có percent
     khác nhau: <70%, 70-100%, >100%, ví dụ >120% để kiểm tra clamp kim
     nhưng label vẫn hiện số thật).
   - Label % và màu label khớp trạng thái (`ok`/`near`/`over`).
   - Dòng "Còn lại"/"Đã vượt hạn mức" phía dưới vẫn hiển thị đúng như cũ.
   - Responsive: xem ở desktop (≥1024px) và mobile (<400px), không tràn ngang.
4. Xóa `barClass()` không dùng nữa trong `BudgetCard.tsx` — chạy lint để xác
   nhận không còn cảnh báo unused.
