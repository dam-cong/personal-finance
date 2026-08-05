import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  username: string | null
  householdName: string | null
  displayName: string | null
  avatarUrl: string | null
  setAuth: (
    token: string,
    username: string,
    householdName?: string,
    displayName?: string,
    avatarUrl?: string,
  ) => void
  setHouseholdName: (name: string) => void
  setProfile: (displayName: string, avatarUrl: string) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      householdName: null,
      displayName: null,
      avatarUrl: null,
      setAuth: (token, username, householdName, displayName, avatarUrl) =>
        set({
          token,
          username,
          householdName: householdName ?? null,
          displayName: displayName ?? null,
          avatarUrl: avatarUrl ?? null,
        }),
      setHouseholdName: (name) => set({ householdName: name }),
      setProfile: (displayName, avatarUrl) => set({ displayName, avatarUrl }),
      logout: () =>
        set({
          token: null,
          username: null,
          householdName: null,
          displayName: null,
          avatarUrl: null,
        }),
    }),
    { name: 'pf_auth' },
  ),
)
