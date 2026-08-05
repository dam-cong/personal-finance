import { create } from 'zustand'
import { fetchConfig } from '../api/config'

interface AppState {
  appName: string
  householdName: string
  load: () => Promise<void>
}

export const useApp = create<AppState>((set) => ({
  appName: 'Personal Finance Chat',
  householdName: '',
  load: async () => {
    try {
      const cfg = await fetchConfig()
      set({ appName: cfg.app_name, householdName: cfg.household_name })
      document.title = cfg.app_name
    } catch {
      // giữ tên mặc định nếu backend chưa chạy
    }
  },
}))
