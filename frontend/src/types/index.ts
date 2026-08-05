export interface Household {
  id: number
  name: string
  created_at: string
  default_budget?: number | null
  slogan?: string
}

export interface User {
  id: number
  username: string
  household_id: number
  created_at: string
  display_name?: string
  avatar_url?: string
}

export interface Transaction {
  id: number
  content: string
  amount: number
  created_at: string
  username: string
}

export interface LoginResponse {
  token: string
  username: string
  household_id: number
  household_name: string
  display_name?: string
  avatar_url?: string
}

export interface AppConfig {
  app_name: string
  household_name: string
}

export interface CreateTransactionResponse {
  transaction: Transaction
  reply: string
  valid?: boolean
  saved?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'bot'
  text: string
  transactionId?: number
  amount?: number
  pending?: boolean
  sortKey: number
}

export type Period = 'month' | 'quarter' | 'year'

export interface Bucket {
  label: string
  total: number
}

export interface Budget {
  id: number
  household_id: number
  month: string
  amount: number
  created_at: string
}

export type BudgetStatus = 'ok' | 'near' | 'over'

export interface BudgetInfo {
  month: string
  amount: number
  spent: number
  percent: number
  remaining: number
  status: BudgetStatus
  default?: boolean
}

export interface DashboardData {
  period: Period
  year: number
  month?: number
  quarter?: number
  total: number
  count: number
  daily?: Bucket[]
  monthly?: Bucket[]
  transactions: Transaction[]
  household?: string
  members?: string[]
  budget?: BudgetInfo | null
}
