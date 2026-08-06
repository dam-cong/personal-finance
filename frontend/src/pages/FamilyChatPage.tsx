import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import FamilyChatWindow from '../components/familychat/FamilyChatWindow'
import {
  fetchMessages,
  markMessagesRead,
  sendImageMessage,
  sendMessage,
} from '../api/messages'
import { useAuth } from '../stores/auth'

function errorMessage(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) ? (err.response?.data?.error ?? fallback) : fallback
}

export default function FamilyChatPage() {
  const currentUsername = useAuth((s) => s.username) ?? ''
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: fetchMessages,
    refetchInterval: 3000,
  })

  useEffect(() => {
    if (!messages || messages.length === 0) return
    markMessagesRead()
      .then(() => queryClient.invalidateQueries({ queryKey: ['unread-messages'] }))
      .catch(() => {
        // bỏ qua; chấm đỏ có thể chưa cập nhật ngay, sẽ tự đúng ở lần poll sau
      })
  }, [messages, queryClient])

  async function handleSend(text: string) {
    setSending(true)
    setError('')
    try {
      await sendMessage(text)
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
    } catch (err) {
      setError(errorMessage(err, 'Gửi tin nhắn thất bại, thử lại sau.'))
    } finally {
      setSending(false)
    }
  }

  async function handleSendImage(file: File) {
    setSending(true)
    setError('')
    try {
      await sendImageMessage(file)
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
    } catch (err) {
      setError(errorMessage(err, 'Gửi ảnh thất bại, thử lại sau.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {error && (
        <p className="mx-auto mt-2 w-full max-w-3xl shrink-0 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <FamilyChatWindow
          messages={messages ?? []}
          currentUsername={currentUsername}
          onSend={handleSend}
          onSendImage={handleSendImage}
          sending={sending}
        />
      </div>
    </div>
  )
}
