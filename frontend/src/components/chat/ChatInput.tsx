import { useRef, useState } from 'react'

interface Props {
  onSend: (text: string) => void
  onSendImage?: (file: File) => void
  disabled?: boolean
  placeholder?: string
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M8 12l6.5-6.5a3 3 0 0 1 4.24 4.24L11 17.5a5 5 0 0 1-7.07-7.07L12.5 2" />
    </svg>
  )
}

export default function ChatInput({
  onSend,
  onSendImage,
  disabled,
  placeholder = 'Nhập: Chi tiêu 1 triệu',
}: Props) {
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || disabled) return
    onSend(value)
    setText('')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file && onSendImage) onSendImage(file)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 bg-white px-4 py-3"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {onSendImage && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              aria-label="Đính kèm ảnh"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              <PaperclipIcon className="h-5 w-5" />
            </button>
          </>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-sm"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Gửi
        </button>
      </div>
    </form>
  )
}
