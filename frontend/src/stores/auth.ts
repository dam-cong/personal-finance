import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  username: string | null
  householdName: string | null
  displayName: string | null
  setAuth: (
    token: string,
    username: string,
    householdName?: string,
    displayName?: string,
  ) => void
  setHouseholdName: (name: string) => void
  setProfile: (displayName: string) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      householdName: null,
      displayName: null,
      setAuth: (token, username, householdName, displayName) =>
        set({
          token,
          username,
          householdName: householdName ?? null,
          displayName: displayName ?? null,
        }),
      setHouseholdName: (name) => set({ householdName: name }),
      setProfile: (displayName) => set({ displayName }),
      logout: () =>
        set({
          token: null,
          username: null,
          householdName: null,
          displayName: null,
        }),
    }),
    { name: 'pf_auth' },
  ),
)
