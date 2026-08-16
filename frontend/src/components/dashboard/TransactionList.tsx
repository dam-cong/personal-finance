import { useMemo, useState } from 'react'
import { formatShortDate, formatVND } from '../../lib/format'
import DeleteIconButton from '../ui/DeleteIconButton'
import type { Transaction } from '../../types'

interface Props {
  transactions: Transaction[]
  members: string[]
  onDelete?: (id: number) => void
  currentUsername?: string
}

const PAGE_SIZE = 10

function amountRowClass(amount: number): string {
  if (amount > 10_000_000) return 'bg-red-200'
  if (amount > 5_000_000) return 'bg-yellow-200'
  if (amount > 1_000_000) return 'bg-[var(--primary-200)]'
  if (amount > 500_000) return 'bg-[var(--primary-100)]'
  return ''
}

export default function TransactionList({
  transactions,
  members,
  onDelete,
  currentUsername,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const totalsByUser = useMemo(() => {
    const totals = new Map<string, number>()
    for (const m of members) totals.set(m, 0)
    for (const t of transactions) {
      totals.set(t.username, (totals.get(t.username) ?? 0) + t.amount)
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [transactions, members])

  const grandTotal = transactions.reduce((sum, t) => sum + t.amount, 0)

  const filtered = selectedUser
    ? transactions.filter((t) => t.username === selectedUser)
    : transactions
  const filteredTotal = selectedUser
    ? (totalsByUser.find(([u]) => u === selectedUser)?.[1] ?? 0)
    : grandTotal

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [filtered],
  )
  const visible = sorted.slice(0, visibleCount)

  function selectUser(user: string | null) {
    setSelectedUser(user)
    setVisibleCount(PAGE_SIZE)
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 text-center text-sm text-gray-400 shadow-sm">
        Chưa có giao dịch nào trong kỳ này.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <span className="text-sm font-semibold text-gray-900">Giao dịch</span>
        <span className="text-sm font-semibold text-red-600">
          {formatVND(filteredTotal)}
        </span>
      </div>
      {totalsByUser.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-5 py-3">
          <button
            onClick={() => selectUser(null)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              selectedUser === null
                ? 'bg-[var(--primary-600)] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả · {formatVND(grandTotal)}
          </button>
          {totalsByUser.map(([user, amount]) => (
            <button
              key={user}
              onClick={() => selectUser(user)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                selectedUser === user
                  ? 'bg-[var(--primary-600)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {user} · {formatVND(amount)}
            </button>
          ))}
        </div>
      )}
      {visible.length === 0 && (
        <p className="px-5 py-6 text-center text-sm text-gray-400">
          Không có giao dịch nào của thành viên này.
        </p>
      )}
      <ul className="divide-y divide-gray-100">
        {visible.map((t) => (
          <li
            key={t.id}
            className={`group flex items-center gap-3 px-5 py-3 ${amountRowClass(t.amount)}`}
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
              <DeleteIconButton
                onClick={() => onDelete(t.id)}
                title="Xóa giao dịch"
              />
            )}
          </li>
        ))}
      </ul>
      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full border-t border-gray-100 py-2.5 text-center text-sm font-medium text-[var(--primary-600)] hover:bg-gray-50"
        >
          Xem thêm ({sorted.length - visibleCount})
        </button>
      )}
    </div>
  )
}
