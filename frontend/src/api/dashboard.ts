import { api } from '../lib/api'
import type { DashboardData, Period, WeekDashboardData } from '../types'

export interface DashboardParams {
  year?: number
  month?: number
  quarter?: number
}

export async function fetchDashboard(
  period: Period,
  params: DashboardParams,
): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>(`/dashboard/${period}`, {
    params,
  })
  return data
}

export async function fetchDashboardWeek(date: string): Promise<WeekDashboardData> {
  const { data } = await api.get<WeekDashboardData>('/dashboard/week', {
    params: { date },
  })
  return data
}
