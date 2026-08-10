import { useState } from 'react'
import { formatVND } from '../../lib/format'
import BudgetGauge from './BudgetGauge'
import Modal from '../ui/Modal'
import type { BudgetInfo } from '../../types'

interface Props {
  budget: BudgetInfo | null | undefined
  monthLabel: string
  monthKey: string
  onSave: (amount: number) => Promise<void>
  onDelete: () => Promise<void>
}

function statusText(b: BudgetInfo) {
  if (b.status === 'over')
    return (
      <>
        Đã vượt hạn mức <strong className="font-bold">{formatVND(-b.remaining)}</strong>
      </>
    )
  return (
    <>
      Còn lại <strong className="font-bold">{formatVND(b.remaining)}</strong>
    </>
  )
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
            className="rounded-xl bg-[var(--primary-50)] px-3 py-1 text-xs font-medium text-[var(--primary-700)] hover:bg-[var(--primary-100)]"
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
          <BudgetGauge percent={budget.percent} status={budget.status} />
          <p
            className={`mt-2 text-center text-sm font-medium ${
              budget.status === 'over' ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {statusText(budget)}
          </p>
        </>
      )}

      <Modal
        open={open}
        title={`Hạn mức tháng ${monthLabel}`}
        onConfirm={save}
        onCancel={() => setOpen(false)}
        confirmLabel={saving ? 'Đang lưu...' : 'Lưu'}
        confirmVariant="primary"
        confirmDisabled={saving}
      >
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
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          autoFocus
        />
        {input && /^\d+$/.test(input.replace(/[^\d]/g, '')) && (
          <p className="mt-2 text-sm text-gray-500">
            {formatVND(Number(input.replace(/[^\d]/g, '')))}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Modal>
    </div>
  )
}
