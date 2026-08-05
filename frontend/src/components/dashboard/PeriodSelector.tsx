import type { Period } from '../../types'

interface Props {
  period: Period
  onPeriodChange: (p: Period) => void
  year: number
  onYearChange: (y: number) => void
  month: number
  onMonthChange: (m: number) => void
  quarter: number
  onQuarterChange: (q: number) => void
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'month', label: 'Tháng' },
  { value: 'quarter', label: 'Quý' },
  { value: 'year', label: 'Năm' },
]

export default function PeriodSelector({
  period,
  onPeriodChange,
  year,
  onYearChange,
  month,
  onMonthChange,
  quarter,
  onQuarterChange,
}: Props) {
  function prev() {
    if (period === 'month') {
      if (month === 1) {
        onYearChange(year - 1)
        onMonthChange(12)
      } else {
        onMonthChange(month - 1)
      }
    } else if (period === 'quarter') {
      if (quarter === 1) {
        onYearChange(year - 1)
        onQuarterChange(4)
      } else {
        onQuarterChange(quarter - 1)
      }
    } else {
      onYearChange(year - 1)
    }
  }

  function next() {
    if (period === 'month') {
      if (month === 12) {
        onYearChange(year + 1)
        onMonthChange(1)
      } else {
        onMonthChange(month + 1)
      }
    } else if (period === 'quarter') {
      if (quarter === 4) {
        onYearChange(year + 1)
        onQuarterChange(1)
      } else {
        onQuarterChange(quarter + 1)
      }
    } else {
      onYearChange(year + 1)
    }
  }

  function label(): string {
    if (period === 'month') return `Tháng ${month}/${year}`
    if (period === 'quarter') return `Quý ${quarter}/${year}`
    return `Năm ${year}`
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          ◀
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {label()}
        </span>
        <button
          onClick={next}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          ▶
        </button>
      </div>
      <div className="flex gap-1 rounded-lg bg-gray-200 p-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              period === p.value
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
