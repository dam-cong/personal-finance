import { formatVND } from '../../lib/format'

interface Props {
  total: number
  count: number
  remaining?: number | null
}

export default function SummaryCards({ total, count, remaining }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        {remaining != null ? (
          <>
            <p className="text-xs text-gray-500">Số tiền còn lại</p>
            <p
              className={`mt-1 text-xl font-bold ${
                remaining >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatVND(remaining)}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500">Tổng chi tiêu</p>
            <p className="mt-1 text-xl font-bold text-red-600">
              {formatVND(total)}
            </p>
          </>
        )}
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="text-xs text-gray-500">Số giao dịch</p>
        <p className="mt-1 text-xl font-bold text-gray-900">{count}</p>
      </div>
    </div>
  )
}
