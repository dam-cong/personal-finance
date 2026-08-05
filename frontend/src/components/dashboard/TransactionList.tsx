import { useMemo, useState } from 'react'
import { formatShortDate, formatVND } from '../../lib/format'
import type { Transaction } from '../../types'

interface Props {
  transactions: Transaction[]
  onDelete?: (id: number) => void
  currentUsername?: string
}

const PAGE_SIZE = 10

export default function TransactionList({
  transactions,
  onDelete,
  currentUsername,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const sorted = useMemo(
    () =>
      [...transactions].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [transactions],
  )
  const visible = sorted.slice(0, visibleCount)

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 text-center text-sm text-gray-400 shadow-sm">
        Chưa có giao dịch nào trong kỳ này.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">
        Giao dịch
      </div>
      <ul className="divide-y divide-gray-100">
        {visible.map((t) => (
          <li
            key={t.id}
            className="group flex items-center gap-3 px-5 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {t.content}
              </p>
              <p className="text-xs text-gray-500">
                {formatShortDate(t.created_at)} · {t.username}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatVND(t.amount)}
            </p>
            {onDelete && currentUsername === t.username && (
              <button
                onClick={() => onDelete(t.id)}
                title="Xóa giao dịch"
                className="hidden h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-600 hover:bg-red-500 hover:text-white group-hover:flex"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full border-t border-gray-100 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-gray-50"
        >
          Xem thêm ({sorted.length - visibleCount})
        </button>
      )}
    </div>
  )
}
