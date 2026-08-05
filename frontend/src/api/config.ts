import { api } from '../lib/api'
import type { AppConfig } from '../types'

export async function fetchConfig(): Promise<AppConfig> {
  const { data } = await api.get<AppConfig>('/config')
  return data
}
