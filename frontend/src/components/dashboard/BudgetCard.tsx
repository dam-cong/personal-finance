import { useState } from 'react'
import { formatVND } from '../../lib/format'
import type { BudgetInfo } from '../../types'

interface Props {
  budget: BudgetInfo | null | undefined
  monthLabel: string
  monthKey: string
  onSave: (amount: number) => Promise<void>
  onDelete: () => Promise<void>
}

function barClass(status: string): string {
  if (status === 'over') return 'bg-red-500'
  if (status === 'near') return 'bg-yellow-400'
  return 'bg-green-500'
}

function statusText(b: BudgetInfo): string {
  if (b.status === 'over')
    return `Đã vượt hạn mức ${formatVND(-b.remaining)}`
  return `Còn lại ${formatVND(b.remaining)}`
}

export default function BudgetCard({
  budget,
  monthLabel,
  monthKey,
  onSave,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openModal() {
    setInput(budget ? String(budget.amount) : '')
    setError('')
    setOpen(true)
  }

  async function save() {
    const amount = Number(input.replace(/[^\d]/g, ''))
    if (!amount || amount <= 0) {
      setError('Nhập số tiền lớn hơn 0')
      return
    }
    setSaving(true)
    try {
      await onSave(amount)
      setOpen(false)
    } catch {
      setError('Lưu thất bại, thử lại sau')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!budget) return
    setSaving(true)
    try {
      await onDelete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          Hạn mức tháng {monthLabel}
          {budget?.default && (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              mặc định
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {budget && !budget.default && (
            <button
              onClick={remove}
              disabled={saving}
              className="text-xs text-gray-400 hover:text-red-600"
            >
              Xóa
            </button>
          )}
          <button
            onClick={openModal}
            disabled={saving}
            className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            {budget && !budget.default ? 'Chỉnh sửa' : 'Đặt hạn mức'}
          </button>
        </div>
      </div>

      {!budget ? (
        <p className="mt-2 text-sm text-gray-400">
          Chưa đặt hạn mức cho tháng này.
        </p>
      ) : (
        <>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xl font-bold text-gray-900">
              {formatVND(budget.spent)}
            </p>
            <p className="text-sm text-gray-500">
              / {formatVND(budget.amount)} · {budget.percent}%
            </p>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${barClass(budget.status)} transition-all`}
              style={{ width: `${Math.min(budget.percent, 100)}%` }}
            />
          </div>
          <p
            className={`mt-2 text-sm font-medium ${
              budget.status === 'over' ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {statusText(budget)}
          </p>
        </>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-semibold text-gray-900">
              Hạn mức tháng {monthLabel}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Tổng chi của cả nhà trong tháng {monthKey} không được vượt quá số
              tiền này.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="VD: 10000000 (10 triệu)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            {input && /^\d+$/.test(input.replace(/[^\d]/g, '')) && (
              <p className="mt-2 text-sm text-gray-500">
                {formatVND(Number(input.replace(/[^\d]/g, '')))}
              </p>
            )}
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
