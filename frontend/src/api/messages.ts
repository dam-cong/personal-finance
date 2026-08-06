import { api } from '../lib/api'
import type { FamilyMessage } from '../types'

export async function fetchMessages(): Promise<FamilyMessage[]> {
  const { data } = await api.get<{ items: FamilyMessage[] }>('/messages')
  return data.items
}

export async function sendMessage(content: string): Promise<FamilyMessage> {
  const { data } = await api.post<{ message: FamilyMessage }>('/messages', {
    content,
  })
  return data.message
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>('/messages/unread-count')
  return data.count
}

export async function markMessagesRead(): Promise<void> {
  await api.post('/messages/read')
}

export async function sendImageMessage(file: File): Promise<FamilyMessage> {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post<{ message: FamilyMessage }>(
    '/messages/image',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.message
}
