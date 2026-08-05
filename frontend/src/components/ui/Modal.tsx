import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  message?: string
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  confirmVariant?: 'primary' | 'destructive'
  confirmDisabled?: boolean
}

export default function Modal({
  open,
  title,
  message,
  children,
  onConfirm,
  onCancel,
  confirmLabel = 'Xóa',
  confirmVariant = 'destructive',
  confirmDisabled = false,
}: Props) {
  if (!open) return null

  const confirmClass =
    confirmVariant === 'primary'
      ? 'rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50'
      : 'rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
        {message && <p className="mb-5 text-sm text-gray-600">{message}</p>}
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={confirmClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
