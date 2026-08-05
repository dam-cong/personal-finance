import { useEffect, useRef } from 'react'
import ChatInput from './ChatInput'
import MessageBubble from './MessageBubble'
import type { ChatMessage } from '../../types'

interface Props {
  messages: ChatMessage[]
  onSend: (text: string) => void
  onDelete?: (transactionId: number) => void
  sending: boolean
}

export default function ChatWindow({ messages, onSend, onDelete, sending }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const firstScroll = useRef(true)

  useEffect(() => {
    if (messages.length === 0) return
    bottomRef.current?.scrollIntoView({
      behavior: firstScroll.current ? 'auto' : 'smooth',
    })
    firstScroll.current = false
  }, [messages.length])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onDelete={onDelete} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatInput onSend={onSend} disabled={sending} />
    </div>
  )
}
