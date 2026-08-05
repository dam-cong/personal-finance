import { formatVND } from '../../lib/format'
import type { ChatMessage } from '../../types'

interface Props {
  message: ChatMessage
  onDelete?: (transactionId: number) => void
}

export default function MessageBubble({ message, onDelete }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
          isUser
            ? 'rounded-br-sm bg-blue-600 text-white'
            : 'rounded-bl-sm bg-white text-gray-900'
        }`}
      >
        <div className="flex items-baseline gap-2">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.text}
          </p>
          {message.amount != null && (
            <span
              className={`text-xs font-semibold whitespace-nowrap ${
                isUser ? 'text-blue-100' : 'text-gray-500'
              }`}
            >
              {formatVND(message.amount)}
            </span>
          )}
        </div>
        {message.pending && (
          <span className="ml-2 text-xs opacity-70">đang gửi...</span>
        )}
        {isUser && message.transactionId != null && onDelete && (
          <button
            onClick={() => onDelete(message.transactionId!)}
            title="Xóa giao dịch"
            className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-600 hover:bg-red-500 hover:text-white group-hover:flex"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
