import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  username: string | null
  householdName: string | null
  setAuth: (token: string, username: string, householdName?: string) => void
  setHouseholdName: (name: string) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      householdName: null,
      setAuth: (token, username, householdName) =>
        set({ token, username, householdName: householdName ?? null }),
      setHouseholdName: (name) => set({ householdName: name }),
      logout: () => set({ token: null, username: null, householdName: null }),
    }),
    { name: 'pf_auth' },
  ),
)
