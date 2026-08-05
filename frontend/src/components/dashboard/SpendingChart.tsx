import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatVND } from '../../lib/format'
import type { Bucket, Period } from '../../types'

interface Props {
  period: Period
  buckets: Bucket[]
}

function formatAxisLabel(value: string, period: Period): string {
  if (period === 'month') {
    const d = new Date(value + 'T00:00:00')
    return `${d.getDate()}/${d.getMonth() + 1}`
  }
  const [y, m] = value.split('-').map(Number)
  return `${m}/${y}`
}

export default function SpendingChart({ period, buckets }: Props) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">
        Chi tiêu theo {period === 'month' ? 'ngày' : 'tháng'}
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={buckets} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tickFormatter={(v: string) => formatAxisLabel(v, period)}
            interval="preserveStartEnd"
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
          <Tooltip
            formatter={(value) => [formatVND(Number(value)), 'Chi tiêu']}
            cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
          />
          <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
