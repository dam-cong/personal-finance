import { useState } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')

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
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập: Chi tiêu 1 triệu"
          disabled={disabled}
          className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none sm:text-sm"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Gửi
        </button>
      </div>
    </form>
  )
}
