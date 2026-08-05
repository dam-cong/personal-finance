import { api } from '../lib/api'
import type { Budget } from '../types'

export async function setBudget(
  month: string,
  amount: number,
): Promise<Budget> {
  const { data } = await api.put<{ budget: Budget }>('/budgets', {
    month,
    amount,
  })
  return data.budget
}

export async function deleteBudget(month: string): Promise<void> {
  await api.delete('/budgets', { params: { month } })
}
