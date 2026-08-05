import { api } from '../lib/api'
import type { CreateTransactionResponse, Transaction } from '../types'

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data } = await api.get<{ items: Transaction[] }>('/transactions')
  return data.items
}

export async function createTransaction(
  message: string,
): Promise<CreateTransactionResponse> {
  const { data } = await api.post<CreateTransactionResponse>('/transactions', {
    message,
  })
  return data
}

export async function deleteTransaction(id: number): Promise<void> {
  await api.delete(`/transactions/${id}`)
}
