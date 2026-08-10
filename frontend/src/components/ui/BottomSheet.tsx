import { useEffect, useState, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export default function BottomSheet({ open, onClose, children, title }: Props) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-lg transition-transform duration-250 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onTransitionEnd={() => {
          if (!open) setMounted(false)
        }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-300" />
        {title && (
          <h2 className="px-5 pt-3 text-base font-semibold text-gray-900">{title}</h2>
        )}
        <div className="px-2 pb-4">{children}</div>
      </div>
    </div>
  )
}
