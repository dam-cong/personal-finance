import { api } from '../lib/api'
import type { DashboardData, Period } from '../types'

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
