import { useEffect, useRef } from 'react'
import ChatInput from '../chat/ChatInput'
import FamilyMessageBubble from './FamilyMessageBubble'
import type { FamilyMessage } from '../../types'

interface Props {
  messages: FamilyMessage[]
  currentUsername: string
  onSend: (text: string) => void
  onSendImage: (file: File) => void
  sending: boolean
}

export default function FamilyChatWindow({
  messages,
  currentUsername,
  onSend,
  onSendImage,
  sending,
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
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.map((m) => (
            <FamilyMessageBubble
              key={m.id}
              message={m}
              isOwn={m.username === currentUsername}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatInput
        onSend={onSend}
        onSendImage={onSendImage}
        disabled={sending}
        placeholder="Nhập tin nhắn..."
      />
    </div>
  )
}
