import { useEffect, useRef, useState } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
  autoFocusNonce?: number
}

export default function ChatInput({
  onSend,
  disabled,
  placeholder = 'Nhập: Chi tiêu 1 triệu',
  autoFocusNonce,
}: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocusNonce) inputRef.current?.focus()
  }, [autoFocusNonce])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || disabled) return
    onSend(value)
    setText('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 bg-white px-4 py-3"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-base focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="rounded-xl bg-[var(--primary-600)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--primary-700)] disabled:opacity-50"
        >
          Gửi
        </button>
      </div>
    </form>
  )
}
