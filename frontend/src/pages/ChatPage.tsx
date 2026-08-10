import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import ChatWindow from '../components/chat/ChatWindow'
import Modal from '../components/ui/Modal'
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
} from '../api/transactions'
import { fetchHousehold } from '../api/household'
import type { ChatMessage, Transaction } from '../types'

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'bot',
  text: 'Chào bạn! Nhập chi tiêu như tin nhắn, VD: Cafe Highland 45000',
  sortKey: 0,
}

const STORAGE_KEY = 'pf_chat_ephemeral'

function loadEphemeral(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const msgs: ChatMessage[] = raw ? JSON.parse(raw) : []
    return msgs.filter((m) => m.role === 'user' && m.pending)
  } catch {
    return []
  }
}

function saveEphemeral(msgs: ChatMessage[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs))
}

export default function ChatPage() {
  const [ephemeral, setEphemeral] = useState<ChatMessage[]>(loadEphemeral)
  const [sending, setSending] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const focusNonce = (location.state as { nonce?: number } | null)?.nonce

  useEffect(() => {
    if (!focusNonce) return
    navigate(location.pathname, { replace: true, state: {} })
  }, [focusNonce, navigate, location.pathname])
  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  })
  const { data: household } = useQuery({
    queryKey: ['household'],
    queryFn: fetchHousehold,
    staleTime: Infinity,
  })

  useEffect(() => {
    saveEphemeral(ephemeral)
  }, [ephemeral])

  const history = useMemo<ChatMessage[]>(
    () =>
      transactions
        ? [...transactions].reverse().map((t) => {
            const ts = new Date(t.created_at).getTime()
            return {
              id: `tx-${t.id}`,
              role: 'user' as const,
              text: t.content,
              transactionId: t.id,
              amount: t.amount,
              sortKey: isNaN(ts) ? t.id : ts,
            }
          })
        : [],
    [transactions],
  )

  function now(): number {
    return Date.now()
  }

  const messages = useMemo<ChatMessage[]>(
    () =>
      [GREETING, ...history, ...ephemeral].sort(
        (a, b) => a.sortKey - b.sortKey,
      ),
    [history, ephemeral],
  )

  async function handleSend(text: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      pending: true,
      sortKey: now(),
    }
    setSending(true)
    setEphemeral((e) => [...e, userMsg])
    try {
      const res = await createTransaction(text)
      queryClient.setQueryData<Transaction[]>(['transactions'], (old) =>
        old ? [res.transaction, ...old] : [res.transaction],
      )
      setEphemeral((e) => [
        ...e.filter((x) => x.id !== userMsg.id),
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: res.reply,
          sortKey: now(),
        },
      ])
    } catch (err) {
      const reply = axios.isAxiosError(err)
        ? (err.response?.data?.reply ?? 'Đã có lỗi xảy ra, thử lại sau.')
        : 'Đã có lỗi xảy ra, thử lại sau.'
      setEphemeral((e) => [
        ...e.filter((x) => x.id !== userMsg.id),
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: reply,
          sortKey: now(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  async function confirmDelete() {
    if (pendingDelete == null) return
    const id = pendingDelete
    setPendingDelete(null)
    try {
      await deleteTransaction(id)
      queryClient.setQueryData<Transaction[]>(['transactions'], (old) =>
        old ? old.filter((t) => t.id !== id) : old,
      )
    } catch {
      // không khôi phục lại; dữ liệu vẫn nhất quán khi tải lại trang
    }
  }

  const deletingText =
    messages.find((m) => m.transactionId === pendingDelete)?.text ?? ''

  return (
    <>
      <ChatWindow
        messages={messages}
        onSend={handleSend}
        onDelete={setPendingDelete}
        sending={sending}
        backgroundImageUrl={household?.image_url}
        autoFocusNonce={focusNonce}
      />
      <Modal
        open={pendingDelete != null}
        title="Xóa giao dịch"
        message={`Bạn có chắc muốn xóa "${deletingText}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
