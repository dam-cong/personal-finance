import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { fetchDashboardWeek } from '../../api/dashboard'

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

export default function WeekdaySpendingChart() {
  const [weekDate, setWeekDate] = useState(() => new Date())
  const dateKey = toDateKey(weekDate)

  const { data } = useQuery({
    queryKey: ['dashboard-week', dateKey],
    queryFn: () => fetchDashboardWeek(dateKey),
  })

  const chartData = WEEKDAY_LABELS.map((label, i) => ({
    label,
    total: data?.daily[i]?.total ?? 0,
  }))

  function shiftWeek(days: number) {
    setWeekDate((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() + days)
      return next
    })
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Chi tiêu theo ngày trong tuần
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftWeek(-7)}
            aria-label="Tuần trước"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="whitespace-nowrap text-xs font-medium text-gray-500">
            {data
              ? `Tuần ${data.iso_week}/${data.iso_year} (${formatShort(data.week_start)} – ${formatShort(data.week_end)})`
              : '...'}
          </span>
          <button
            onClick={() => shiftWeek(7)}
            aria-label="Tuần sau"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
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
          <Tooltip formatter={(value) => [formatVND(Number(value)), 'Chi tiêu']} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="var(--primary-600)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--primary-600)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
