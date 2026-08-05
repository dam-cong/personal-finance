import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatVND } from '../../lib/format'
import type { Transaction } from '../../types'

interface Props {
  transactions: Transaction[]
  rangeStart: Date
  rangeEnd: Date
}

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
// JS Date#getDay(): 0=CN,1=T2,...,6=T7 -> map sang thứ tự hiển thị T2..CN
const JS_DAY_TO_INDEX = [6, 0, 1, 2, 3, 4, 5]

function buildWeekdayData(transactions: Transaction[], rangeStart: Date, rangeEnd: Date) {
  const totals = new Array(7).fill(0)
  const counts = new Array(7).fill(0)

  const cursor = new Date(rangeStart)
  while (cursor <= rangeEnd) {
    counts[JS_DAY_TO_INDEX[cursor.getDay()]]++
    cursor.setDate(cursor.getDate() + 1)
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
          <XAxis
            dataKey="label"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip formatter={(value) => [formatVND(Number(value)), 'TB chi tiêu']} />
          <Line
            type="monotone"
            dataKey="average"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3, fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
