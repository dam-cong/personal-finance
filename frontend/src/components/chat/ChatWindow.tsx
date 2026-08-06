import { useEffect, useRef } from 'react'
import ChatInput from './ChatInput'
import MessageBubble from './MessageBubble'
import type { ChatMessage } from '../../types'

interface Props {
  messages: ChatMessage[]
  onSend: (text: string) => void
  onDelete?: (transactionId: number) => void
  sending: boolean
  backgroundImageUrl?: string
}

export default function ChatWindow({
  messages,
  onSend,
  onDelete,
  sending,
  backgroundImageUrl,
}: Props) {
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
      <div className="relative flex-1 overflow-y-auto">
        {backgroundImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          />
        )}
        <div className="relative space-y-3 px-4 py-4">
          <div className="mx-auto max-w-3xl space-y-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onDelete={onDelete} />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
      <ChatInput onSend={onSend} disabled={sending} />
    </div>
  )
}
