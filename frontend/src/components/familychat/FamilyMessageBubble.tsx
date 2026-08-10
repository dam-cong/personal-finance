import Avatar from '../ui/Avatar'
import type { FamilyMessage } from '../../types'

interface Props {
  message: FamilyMessage
  isOwn: boolean
}

export default function FamilyMessageBubble({ message, isOwn }: Props) {
  const nameLabel = message.display_name || message.username

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar avatarUrl={message.avatar_url} label={nameLabel} />
      <div className={`flex max-w-[70%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="mb-0.5 px-1 text-xs font-medium text-gray-500">
            {nameLabel}
          </span>
        )}
        {message.image_url ? (
          <a href={message.image_url} target="_blank" rel="noreferrer">
            <img
              src={message.image_url}
              alt="Ảnh"
              className="max-w-[240px] rounded-xl shadow-sm"
            />
          </a>
        ) : (
          <div
            className={`rounded-2xl px-4 py-2 shadow-sm ${
              isOwn
                ? 'rounded-br-sm bg-[var(--primary-600)] text-white'
                : 'rounded-bl-sm bg-white text-gray-900'
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </p>
          </div>
        )}
        {message.image_url && message.content && (
          <p className="mt-1 max-w-[240px] whitespace-pre-wrap break-words px-1 text-sm text-gray-700">
            {message.content}
          </p>
        )}
      </div>
    </div>
  )
}
